namespace WASM.Models;

public enum TicTacToePlayer
{
    None,
    X,
    O,
}

public enum TicTacToeDifficulty
{
    Easy,
    Medium,
    Hard,
}

/// <summary>
/// Pure Tic Tac Toe logic. No Blazor dependencies so it stays testable.
/// Supports win/draw detection plus a computer opponent:
/// Easy plays randomly, Medium takes immediate wins and blocks,
/// Hard plays perfectly via minimax.
/// </summary>
public sealed class TicTacToeGame
{
    private static readonly int[][] Lines =
    [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    public TicTacToePlayer[] Board { get; } = new TicTacToePlayer[9];
    public TicTacToePlayer CurrentPlayer { get; private set; } = TicTacToePlayer.X;
    public TicTacToePlayer Winner { get; private set; } = TicTacToePlayer.None;
    public bool IsDraw { get; private set; }
    public int[]? WinningLine { get; private set; }

    public bool IsGameOver => Winner != TicTacToePlayer.None || IsDraw;

    public void Reset(TicTacToePlayer startingPlayer = TicTacToePlayer.X)
    {
        Array.Clear(Board);
        CurrentPlayer = startingPlayer == TicTacToePlayer.O ? TicTacToePlayer.O : TicTacToePlayer.X;
        Winner = TicTacToePlayer.None;
        IsDraw = false;
        WinningLine = null;
    }

    public bool TryMove(int index)
    {
        if (index < 0 || index > 8 || Board[index] != TicTacToePlayer.None || IsGameOver)
        {
            return false;
        }

        Board[index] = CurrentPlayer;
        Evaluate();

        if (!IsGameOver)
        {
            CurrentPlayer = CurrentPlayer == TicTacToePlayer.X ? TicTacToePlayer.O : TicTacToePlayer.X;
        }

        return true;
    }

    private void Evaluate()
    {
        foreach (var line in Lines)
        {
            var a = Board[line[0]];
            if (a != TicTacToePlayer.None && a == Board[line[1]] && a == Board[line[2]])
            {
                Winner = a;
                WinningLine = line;
                return;
            }
        }

        IsDraw = Array.IndexOf(Board, TicTacToePlayer.None) < 0;
    }

    public int GetBestMove(TicTacToeDifficulty difficulty, TicTacToePlayer aiPlayer, Random? random = null)
    {
        random ??= Random.Shared;
        var empty = GetEmptyCells(Board).ToList();

        if (empty.Count == 0)
        {
            return -1;
        }

        if (difficulty == TicTacToeDifficulty.Easy)
        {
            return empty[random.Next(empty.Count)];
        }

        // Take an immediate win, then block the opponent's immediate win.
        var win = FindImmediateWin(Board, aiPlayer);
        if (win >= 0)
        {
            return win;
        }

        var block = FindImmediateWin(Board, Opponent(aiPlayer));
        if (block >= 0)
        {
            return block;
        }

        if (difficulty == TicTacToeDifficulty.Medium)
        {
            return empty[random.Next(empty.Count)];
        }

        // Hard: full minimax, never loses.
        var bestScore = int.MinValue;
        var bestMove = empty[0];
        foreach (var move in empty)
        {
            Board[move] = aiPlayer;
            var score = Minimax(Board, false, aiPlayer, 0);
            Board[move] = TicTacToePlayer.None;
            if (score > bestScore)
            {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    private static int Minimax(TicTacToePlayer[] board, bool maximizing, TicTacToePlayer aiPlayer, int depth)
    {
        var winner = GetWinner(board);
        if (winner == aiPlayer)
        {
            return 10 - depth;
        }

        if (winner == Opponent(aiPlayer))
        {
            return depth - 10;
        }

        if (GetEmptyCells(board).Any() == false)
        {
            return 0;
        }

        if (maximizing)
        {
            var best = int.MinValue;
            foreach (var move in GetEmptyCells(board))
            {
                board[move] = aiPlayer;
                best = Math.Max(best, Minimax(board, false, aiPlayer, depth + 1));
                board[move] = TicTacToePlayer.None;
            }

            return best;
        }

        var worst = int.MaxValue;
        foreach (var move in GetEmptyCells(board))
        {
            board[move] = Opponent(aiPlayer);
            worst = Math.Min(worst, Minimax(board, true, aiPlayer, depth + 1));
            board[move] = TicTacToePlayer.None;
        }

        return worst;
    }

    private static int FindImmediateWin(TicTacToePlayer[] board, TicTacToePlayer player)
    {
        foreach (var move in GetEmptyCells(board))
        {
            board[move] = player;
            var wins = GetWinner(board) == player;
            board[move] = TicTacToePlayer.None;
            if (wins)
            {
                return move;
            }
        }

        return -1;
    }

    private static TicTacToePlayer GetWinner(TicTacToePlayer[] board)
    {
        foreach (var line in Lines)
        {
            var a = board[line[0]];
            if (a != TicTacToePlayer.None && a == board[line[1]] && a == board[line[2]])
            {
                return a;
            }
        }

        return TicTacToePlayer.None;
    }

    private static IEnumerable<int> GetEmptyCells(TicTacToePlayer[] board)
    {
        for (var i = 0; i < board.Length; i++)
        {
            if (board[i] == TicTacToePlayer.None)
            {
                yield return i;
            }
        }
    }

    private static TicTacToePlayer Opponent(TicTacToePlayer player) =>
        player == TicTacToePlayer.X ? TicTacToePlayer.O : TicTacToePlayer.X;
}
