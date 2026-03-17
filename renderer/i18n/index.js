import az from './az';
import ru from './ru';
import en from './en';

export const languages = { az, ru, en };

export const languageNames = {
  az: 'Azərbaycan',
  ru: 'Русский',
  en: 'English',
};

export const languageFlags = {
  az: '🇦🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
};

export function getTranslation(lang = 'az') {
  return languages[lang] || languages.az;
}

export default languages;
