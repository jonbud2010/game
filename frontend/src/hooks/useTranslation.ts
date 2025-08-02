import { useTranslation as useI18nTranslation } from 'react-i18next';
import type { PlayerColor, PlayerPosition } from '@football-tcg/shared';

// General translation hook
export const useTranslation = (namespace?: string) => {
  return useI18nTranslation(namespace);
};

// Typed color translation hook
export const useColorTranslation = () => {
  const { t } = useI18nTranslation('game');
  
  return (colorKey: PlayerColor): string => t(`colors.${colorKey}`);
};

// Typed position translation hook
export const usePositionTranslation = () => {
  const { t } = useI18nTranslation('game');
  
  return (positionKey: PlayerPosition): string => t(`positions.${positionKey}`);
};

// Common translations hook for frequently used namespaces
export const useCommonTranslations = () => {
  const { t: common } = useI18nTranslation('common');
  const { t: game } = useI18nTranslation('game');
  const { t: admin } = useI18nTranslation('admin');
  const { t: errors } = useI18nTranslation('errors');
  
  return {
    common,
    game,
    admin,
    errors
  };
};

// Hook for dynamic namespace loading
export const useNamespaceTranslation = (namespace: string) => {
  const { t, i18n } = useI18nTranslation();
  
  // Load namespace if not already loaded
  if (!i18n.hasLoadedNamespace(namespace)) {
    i18n.loadNamespaces(namespace);
  }
  
  return useI18nTranslation(namespace);
};