export const useHighScore = (gameId: string) => {
  const getHighScore = (): number => {
    try {
      const scores = JSON.parse(localStorage.getItem('docprocc_arcade_scores') || '{}');
      return scores[gameId] || 0;
    } catch {
      return 0;
    }
  };

  const saveHighScore = (score: number): boolean => {
    try {
      const current = getHighScore();
      if (score > current) {
        const scores = JSON.parse(localStorage.getItem('docprocc_arcade_scores') || '{}');
        scores[gameId] = score;
        localStorage.setItem('docprocc_arcade_scores', JSON.stringify(scores));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return { getHighScore, saveHighScore };
};
