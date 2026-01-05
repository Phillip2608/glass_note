export interface Note {
    id: string;
    title: string;
    content: string;
}

export interface Snippet {
    trigger: string;
    content: string;
}

export interface Settings {
    fontFamily: string;
    fontSize: string;
    color: string;
    opacity: string;
    blurEnabled: boolean;
    blurAmount: string;
    backgroundType: 'solid' | 'gradient';
    gradientStart: string;
    gradientEnd: string;
    gradientAngle: number;
    telegramApiId: string;
    telegramApiHash: string;
    telegramPhoneNumber: string;
    telegramBridgeUrl: string;
    accountingData: string;
}
