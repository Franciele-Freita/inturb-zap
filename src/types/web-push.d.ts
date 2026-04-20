declare module "web-push" {
  export type PushSubscription = {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  export type VapidKeys = {
    publicKey: string;
    privateKey: string;
  };

  const webpush: {
    sendNotification(subscription: PushSubscription, payload?: string): Promise<unknown>;
    generateVAPIDKeys(): VapidKeys;
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  };

  export = webpush;
}
