-- Agricrowd.uz: BARCHA ma'lumotlarni (demo loyihalar, investitsiyalar, foydalanuvchilar, to'lovlar...) o'chiradi.
-- Faqat real ishga tushirishdan OLDIN ishlating! Ortga qaytarib bo'lmaydi.
-- Keyin saytni ochganingizda admin hisobi Netlify'dagi ADMIN_EMAIL / ADMIN_PASSWORD bilan qayta yaratiladi
-- (demo ma'lumotlarsiz bo'lishi uchun Netlify'da SEED_DEMO=false bo'lishi shart).
truncate public.users, public.projects, public.investments, public.monitoring_updates, public.contracts,
  public.payments, public.withdrawals, public.notifications, public.transactions, public.activity_logs,
  public.news, public.messages cascade;
update public.agri_meta set version = version + 1, settings = null where id = 1;
