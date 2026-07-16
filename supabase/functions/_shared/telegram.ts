// Shared by submit-profile (new-user alerts) and admin-actions (gate
// rotation alerts). Deliberately has NO hardcoded token/chat-id fallback -
// unlike the earlier version of this project, a missing secret here just
// means "skip the notification", not "fall back to a value baked into
// source control".
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return; // not configured yet - silently skip

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {
    // Notification failures should never break the caller's main action.
  }
}
