


export const nextPlayerId = (playerIds: string[], playerId: string, next: number = 1): string => {
    const index = playerIds.indexOf(playerId);
    return playerIds[(index + next) % playerIds.length] as string;
}
