import { Button } from './ui/Button';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'dukonchi_bot';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

/**
 * "Botga ulash" — Telegram ulashish oynasini ochadi (bot havolasi + taklif matni).
 * Egasi qabul qiluvchini (mijoz/ta'minotchi) Telegram kontaktlaridan tanlaydi.
 * Faqat hali ulanmaganlar uchun ko'rsatiladi.
 */
export function BotInviteButton({ name }: { name?: string }) {
  const text =
    `Assalomu alaykum${name ? `, ${name}` : ''}! Bizning Telegram botimizga ulaning — ` +
    `xaridlar va qarz holatini shu yerda kuzatasiz. Botni ochib "Telefon raqamni ulashish" tugmasini bosing 👇`;
  const shareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(text)}`;

  return (
    <Button variant="ghost" size="sm" icon={<IconTelegram />} onClick={() => window.open(shareUrl, '_blank')}>
      Botga ulash
    </Button>
  );
}

function IconTelegram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}
