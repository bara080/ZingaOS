type VexoDevice = {
  model?: string;
  os?: string;
};

export type VexoEvent = {
  id: string;
  route?: string;
  timestamp: string;
  appVersion?: string;
  location?: string;
  customerUid?: string;
  sessionId?: string;
  device: VexoDevice;
};
