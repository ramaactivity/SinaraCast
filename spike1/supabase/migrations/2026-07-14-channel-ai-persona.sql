-- Karakter (persona) AI per akun. Sekali disetel, caption AI otomatis mengikuti
-- gaya akun itu tanpa perlu brief ulang tiap kali. Disimpan sebagai jsonb supaya
-- lentur & mudah ditambah field baru (voice/audience/emoji/signature/hashtags/avoid).
-- Contoh: {"preset":"casual","voice":"hangat & santai seperti teman","audience":"anak muda 18-25",
--          "emoji":"sedikit","signature":"Yuk mampir!","hashtags":"#kopisusu","avoid":"bahasa alay"}
alter table channel add column if not exists ai_persona jsonb;
