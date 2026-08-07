export type SafetyCapability = 'local-basic' | 'server-assisted';

export interface LocalSafetyScope {
  capability: 'local-basic';
  offlineChecklist: true;
  userInitiatedEmergencyCall: true;
  userInitiatedTrustedContactCall: true;
  localCheckInWhileAppActive: true;
  automaticEmergencyCall: false;
  automaticContactNotification: false;
  backgroundMonitoringGuaranteed: false;
  callCompletionKnown: false;
  geolocationEscalation: false;
}

export const CURRENT_SAFETY_SCOPE: LocalSafetyScope = {
  capability: 'local-basic',
  offlineChecklist: true,
  userInitiatedEmergencyCall: true,
  userInitiatedTrustedContactCall: true,
  localCheckInWhileAppActive: true,
  automaticEmergencyCall: false,
  automaticContactNotification: false,
  backgroundMonitoringGuaranteed: false,
  callCompletionKnown: false,
  geolocationEscalation: false
};

export const SAFETY_DISCLOSURE_RU =
  'USNEE не вызывает помощь автоматически. Звонок начнётся только после вашего нажатия и подтверждения телефоном.';

export const SAFETY_TIMER_DISCLOSURE_RU =
  'Таймер работает только пока Mini App активен. Он не уведомляет контакты и не вызывает помощь автоматически.';

export const SAFETY_CALL_UNVERIFIED_RU =
  'Открылось приложение телефона. USNEE не может подтвердить, состоялся ли звонок.';

export const SAFETY_DANGER_SIGNS_RU =
  'Несколько признаков могут указывать на опасное состояние. Не жди ухудшения — свяжись с экстренной службой.';

/**
 * Default emergency number shown by the SOS sheet. It is a regional default,
 * not a universal worldwide number — the UI must say so explicitly.
 */
export const DEFAULT_EMERGENCY_NUMBER = '103';

export const EMERGENCY_NUMBER_REGION_NOTE_RU =
  'Номер по умолчанию — 103. Убедитесь, что он действует в вашей стране.';
