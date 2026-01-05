export enum BotStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
    BACKTESTING = 'BACKTESTING'
}

export enum StrategyType {
    SCALPING = 'SCALPING',
    SWING_TRADING = 'SWING_TRADING',
    DCA = 'DCA',
    GRID_TRADING = 'GRID_TRADING',
    ARBITRAGE = 'ARBITRAGE',
    TECHNICAL_INDICATOR = 'TECHNICAL_INDICATOR',
    CUSTOM = 'CUSTOM'
}

export interface Bot {
    id?: number;
    name: string;
    description: string;
    strategyType: StrategyType;
    status?: BotStatus;
    userId?: number;
    configuration: string; // JSON string
    investmentAmount: number;
    tradingPair: string;
    maxPositionSize: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface BotTemplate {
    id?: number;
    name: string;
    description: string;
    strategyType: StrategyType;
    defaultConfiguration: string;
    historicalReturns: number;
    winRate: number;
    drawdown: number;
    sharpeRatio: number;
    popularity: number;
}
