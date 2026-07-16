import { ENV } from '../config/env';

const PING_INTERVAL_MS = 25000;
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 15000;
const REQUEST_TIMEOUT_MS = 15000;

export class DerivSocket {
  constructor() {
    this.ws = null;
    this.reqCounter = 1;
    this.pending = new Map();
    this.tickListeners = new Map();
    this.tickSubscriptionIds = new Map();
    this.balanceListeners = new Set();
    this.contractListeners = new Map();
    this.contractSubscriptionIds = new Map();
    this.connectionListeners = new Set();
    this.currentProposalSubId = null;
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.shouldReconnect = true;
    this.authToken = null;
    this.status = 'idle';
  }

  logout() {
    this.authToken = null;
    this.disconnect();
  }

  onConnectionChange(cb) {
    this.connectionListeners.add(cb);
    cb(this.status);
    return () => this.connectionListeners.delete(cb);
  }

  _emitStatus(status) {
    this.status = status;
    this.connectionListeners.forEach((cb) => {
      try { cb(status); } catch { }
    });
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    
    // SAFETY CHECK: Verify environment variables exist before connecting
    if (!ENV.DERIV_WS_URL || !ENV.DERIV_APP_ID) {
      console.error("CONNECTION ABORTED: ENV variables are missing! Check your .env or app.config.js");
      console.error("Current ENV config:", JSON.stringify(ENV));
      this._emitStatus('error');
      return;
    }

    this.shouldReconnect = true;
    this._emitStatus('connecting');

    const url = `${ENV.DERIV_WS_URL}?app_id=${ENV.DERIV_APP_ID}`;
    console.log("DEBUG: Attempting connection to URL:", url);

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this._emitStatus('open');
      this._startPing();
      if (this.authToken) this.authorize(this.authToken).catch(() => {});
      for (const symbol of this.tickListeners.keys()) {
        this._send({ ticks: symbol, subscribe: 1 });
      }
      if (this.balanceListeners.size > 0) this._send({ balance: 1, subscribe: 1 });
    };

    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      this._route(data);
    };

    ws.onerror = (e) => {
      console.log("WebSocket Error:", e.message || "Connection failed. Check App ID/URL.");
      this._emitStatus('error');
    };

    ws.onclose = (e) => {
      console.log("WebSocket Closed. Code:", e.code, "Reason:", e.reason);
      this._stopPing();
      this._emitStatus('closed');
      if (this.shouldReconnect) this._scheduleReconnect();
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this._stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) { try { this.ws.close(); } catch { } }
  }

  _scheduleReconnect() {
    this.reconnectAttempt += 1;
    const delay = Math.min(RECONNECT_BASE_MS * this.reconnectAttempt, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => this._send({ ping: 1 }), PING_INTERVAL_MS);
  }

  _stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  _send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return null;
    const req_id = this.reqCounter++;
    this.ws.send(JSON.stringify({ ...payload, req_id }));
    return req_id;
  }

  _request(payload, timeoutMs = REQUEST_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected to Deriv yet.'));
        return;
      }
      const req_id = this.reqCounter++;
      const timer = setTimeout(() => {
        this.pending.delete(req_id);
        reject(new Error('Deriv request timed out.'));
      }, timeoutMs);
      this.pending.set(req_id, {
        resolve: (data) => { clearTimeout(timer); resolve(data); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });
      this.ws.send(JSON.stringify({ ...payload, req_id }));
    });
  }

  _route(data) {
    const reqId = data.req_id;
    if (data.error) {
      if (reqId && this.pending.has(reqId)) {
        this.pending.get(reqId).reject(new Error(data.error.message || 'Deriv API error'));
        this.pending.delete(reqId);
        return;
      }
    }
    if (reqId && this.pending.has(reqId)) {
      this.pending.get(reqId).resolve(data);
      this.pending.delete(reqId);
    }
    switch (data.msg_type) {
      case 'tick': {
        const symbol = data.tick?.symbol;
        if (data.subscription?.id && symbol) this.tickSubscriptionIds.set(symbol, data.subscription.id);
        const listeners = this.tickListeners.get(symbol);
        if (listeners) listeners.forEach((cb) => cb(data.tick));
        break;
      }
      case 'proposal': {
        if (data.subscription?.id) this.currentProposalSubId = data.subscription.id;
        if (this._onProposal) this._onProposal(data.proposal, data.error || null);
        break;
      }
      case 'balance': {
        this.balanceListeners.forEach((cb) => cb(data.balance));
        break;
      }
      case 'proposal_open_contract': {
        const id = data.proposal_open_contract?.contract_id;
        if (data.subscription?.id && id) this.contractSubscriptionIds.set(id, data.subscription.id);
        const listeners = this.contractListeners.get(id);
        if (listeners) listeners.forEach((cb) => cb(data.proposal_open_contract));
        break;
      }
      default:
        break;
    }
  }

  authorize(token) {
    this.authToken = token;
    return this._request({ authorize: token });
  }

  activeSymbols() {
    return this._request({ active_symbols: 'brief', product_type: 'basic' });
  }

  subscribeTicks(symbol, callback) {
    if (!this.tickListeners.has(symbol)) this.tickListeners.set(symbol, new Set());
    this.tickListeners.get(symbol).add(callback);
    this._send({ ticks: symbol, subscribe: 1 });
    return () => {
      const set = this.tickListeners.get(symbol);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) {
        this.tickListeners.delete(symbol);
        const subId = this.tickSubscriptionIds.get(symbol);
        if (subId) this._send({ forget: subId });
        this.tickSubscriptionIds.delete(symbol);
      }
    };
  }

  subscribeProposal(params, callback) {
    if (this.currentProposalSubId) {
      this._send({ forget: this.currentProposalSubId });
      this.currentProposalSubId = null;
    }
    this._onProposal = callback;
    this._send({ proposal: 1, subscribe: 1, ...params });
    return () => {
      if (this.currentProposalSubId) {
        this._send({ forget: this.currentProposalSubId });
        this.currentProposalSubId = null;
      }
      this._onProposal = null;
    };
  }

  buy(proposalId, price) {
    return this._request({ buy: proposalId, price });
  }

  subscribeBalance(callback) {
    this.balanceListeners.add(callback);
    this._send({ balance: 1, subscribe: 1 });
    return () => this.balanceListeners.delete(callback);
  }

  subscribeContract(contractId, callback) {
    if (!this.contractListeners.has(contractId)) this.contractListeners.set(contractId, new Set());
    this.contractListeners.get(contractId).add(callback);
    this._send({ proposal_open_contract: 1, subscribe: 1, contract_id: contractId });
    return () => {
      const set = this.contractListeners.get(contractId);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) {
        this.contractListeners.delete(contractId);
        const subId = this.contractSubscriptionIds.get(contractId);
        if (subId) this._send({ forget: subId });
        this.contractSubscriptionIds.delete(contractId);
      }
    };
  }

  profitTable(params = {}) {
    return this._request({ profit_table: 1, description: 1, sort: 'DESC', limit: 20, ...params });
  }
}

export const derivSocket = new DerivSocket();