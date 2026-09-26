namespace WASM.Models;

/// <summary>
/// Outcome of tapping a cell.
/// </summary>
public enum SelectResult
{
    Ignored,
    Selected,
    Deselected,
    Paired,
    RejectedSum,
    RejectedBlocked,
}

/// <summary>
/// A single board tile. Cleared tiles stay in <see cref="NumberMatchGame.Cells"/>
/// as placeholders so row/column geometry (needed for the adjacency rule) is preserved.
/// </summary>
public sealed class NumberCell
{
    public int Id { get; init; }
    public int Row { get; set; }
    public int Col { get; set; }
    public int Value { get; set; }
    public bool Cleared { get; set; }
}

/// <summary>
/// Pure game logic for Number Match (make 10). No Blazor dependencies so it stays testable.
/// Rules: a pair clears only when a + b == 10 AND the cells are connectable:
/// 8-neighbour adjacent, same row/col/diagonal with only cleared cells between,
/// or linear neighbours (all flattened cells between are cleared, covering row-wrap).
/// </summary>
public sealed class NumberMatchGame
{
    public const int Cols = 9;
    public const int BaseRows = 4;
    public const int MaxRows = 12;
    public const int AddRowsPerLevel = 3;
    public const int MaxInitialRows = 6;

    private int _nextId;
    private Random _random = new();

    public List<NumberCell> Cells { get; } = new();
    public int? SelectedId { get; private set; }
    public int Score { get; private set; }
    public int Moves { get; private set; }
    public int PairsFound { get; private set; }
    public int FailedAttempts { get; private set; }
    public int Level { get; private set; } = 1;
    public int AddRowsLeft { get; private set; } = AddRowsPerLevel;

    public int RowCount => Cells.Count == 0 ? 0 : Cells.Max(c => c.Row) + 1;
    public int Remaining => Cells.Count(c => !c.Cleared);
    public bool IsCleared => Cells.Count > 0 && Remaining == 0;

    public NumberMatchGame()
    {
        NewGame();
    }

    public void NewGame(int level = 1, int? seed = null)
    {
        Level = Math.Max(1, level);
        _random = seed.HasValue ? new Random(seed.Value) : new Random();
        var rows = Math.Min(BaseRows + (Level - 1), MaxInitialRows);
        Deal(rows);
    }

    public void NextLevel()
    {
        NewGame(Level + 1);
    }

    public void ReplayLevel()
    {
        NewGame(Level);
    }

    private void Deal(int rows)
    {
        Cells.Clear();
        _nextId = 0;
        SelectedId = null;
        Score = 0;
        Moves = 0;
        PairsFound = 0;
        FailedAttempts = 0;
        AddRowsLeft = AddRowsPerLevel;

        for (var r = 0; r < rows; r++)
        {
            for (var c = 0; c < Cols; c++)
            {
                Cells.Add(new NumberCell
                {
                    Id = _nextId++,
                    Row = r,
                    Col = c,
                    Value = _random.Next(1, 10),
                });
            }
        }

        EnsureSolvable();
    }

    /// <summary>
    /// Guarantee at least one connectable sum-10 pair on a fresh deal
    /// by planting a complementary adjacent pair in the first row.
    /// </summary>
    private void EnsureSolvable()
    {
        if (FindHint() is not null)
        {
            return;
        }

        var first = Cells.Where(c => c.Row == 0).OrderBy(c => c.Col).Take(2).ToList();
        if (first.Count == 2)
        {
            var a = _random.Next(1, 10);
            first[0].Value = a;
            first[1].Value = 10 - a;
        }
    }

    public NumberCell? GetCell(int id) => Cells.FirstOrDefault(c => c.Id == id);

    public SelectResult TrySelect(int id, out NumberCell? pairedWith)
    {
        pairedWith = null;
        var cell = GetCell(id);
        if (cell is null || cell.Cleared)
        {
            return SelectResult.Ignored;
        }

        if (SelectedId == id)
        {
            SelectedId = null;
            return SelectResult.Deselected;
        }

        if (SelectedId is null)
        {
            SelectedId = id;
            return SelectResult.Selected;
        }

        var first = GetCell(SelectedId.Value);
        if (first is null || first.Cleared)
        {
            SelectedId = id;
            return SelectResult.Selected;
        }

        Moves++;
        if (first.Value + cell.Value != 10)
        {
            FailedAttempts++;
            SelectedId = id; // keep newest tap selected for fast play
            return SelectResult.RejectedSum;
        }

        if (!IsPairAllowed(first, cell))
        {
            FailedAttempts++;
            SelectedId = id;
            return SelectResult.RejectedBlocked;
        }

        first.Cleared = true;
        cell.Cleared = true;
        pairedWith = first;
        SelectedId = null;
        PairsFound++;
        Score += 10;
        return SelectResult.Paired;
    }

    public void ClearSelection()
    {
        SelectedId = null;
    }

    /// <summary>
    /// Classic-style connectivity check (see class docs).
    /// </summary>
    public bool IsPairAllowed(NumberCell a, NumberCell b)
    {
        if (a.Id == b.Id || a.Cleared || b.Cleared)
        {
            return false;
        }

        var dr = Math.Abs(a.Row - b.Row);
        var dc = Math.Abs(a.Col - b.Col);

        // 1. Direct neighbours (incl. diagonals).
        if (Math.Max(dr, dc) == 1)
        {
            return true;
        }

        var byIndex = Cells.OrderBy(c => c.Row).ThenBy(c => c.Col).ToList();

        // 2. Same row with a clear path between.
        if (a.Row == b.Row)
        {
            var lo = Math.Min(a.Col, b.Col);
            var hi = Math.Max(a.Col, b.Col);
            var blocked = byIndex.Any(c => c.Row == a.Row && c.Col > lo && c.Col < hi && !c.Cleared);
            if (!blocked)
            {
                return true;
            }
        }

        // 3. Same column with a clear path between.
        if (a.Col == b.Col)
        {
            var lo = Math.Min(a.Row, b.Row);
            var hi = Math.Max(a.Row, b.Row);
            var blocked = byIndex.Any(c => c.Col == a.Col && c.Row > lo && c.Row < hi && !c.Cleared);
            if (!blocked)
            {
                return true;
            }
        }

        // 3b. Same diagonal with a clear path between (gaps allowed if cleared).
        if (dr == dc && dr > 1)
        {
            var stepR = Math.Sign(b.Row - a.Row);
            var stepC = Math.Sign(b.Col - a.Col);
            var blocked = false;
            var r = a.Row + stepR;
            var c = a.Col + stepC;
            while (r != b.Row && c != b.Col)
            {
                var mid = Cells.FirstOrDefault(cell => cell.Row == r && cell.Col == c);
                if (mid is not null && !mid.Cleared)
                {
                    blocked = true;
                    break;
                }

                r += stepR;
                c += stepC;
            }

            if (!blocked)
            {
                return true;
            }
        }

        // 4. Linear neighbours in flattened order (covers end-of-row -> start-of-next-row).
        var ia = byIndex.FindIndex(c => c.Id == a.Id);
        var ib = byIndex.FindIndex(c => c.Id == b.Id);
        if (ia >= 0 && ib >= 0)
        {
            var lo = Math.Min(ia, ib);
            var hi = Math.Max(ia, ib);
            var blocked = false;
            for (var i = lo + 1; i < hi; i++)
            {
                if (!byIndex[i].Cleared)
                {
                    blocked = true;
                    break;
                }
            }

            if (!blocked)
            {
                return true;
            }
        }

        return false;
    }

    public (NumberCell First, NumberCell Second)? FindHint()
    {
        var active = Cells.Where(c => !c.Cleared).ToList();
        for (var i = 0; i < active.Count; i++)
        {
            for (var j = i + 1; j < active.Count; j++)
            {
                if (active[i].Value + active[j].Value == 10 && IsPairAllowed(active[i], active[j]))
                {
                    return (active[i], active[j]);
                }
            }
        }

        return null;
    }

    public bool HasMoves() => FindHint() is not null;

    public bool CanAddRow() => AddRowsLeft > 0 && RowCount < MaxRows && !IsCleared;

    /// <summary>
    /// Append a copy of the remaining active values as new row(s), classic Numberzilla style.
    /// </summary>
    public bool AddRow()
    {
        if (!CanAddRow())
        {
            return false;
        }

        var values = Cells
            .OrderBy(c => c.Row)
            .ThenBy(c => c.Col)
            .Where(c => !c.Cleared)
            .Select(c => c.Value)
            .ToList();

        if (values.Count == 0)
        {
            return false;
        }

        SelectedId = null;
        var row = RowCount;
        var col = 0;
        foreach (var value in values)
        {
            Cells.Add(new NumberCell
            {
                Id = _nextId++,
                Row = row,
                Col = col,
                Value = value,
            });
            col++;
            if (col >= Cols)
            {
                col = 0;
                row++;
            }
        }

        AddRowsLeft--;
        return true;
    }

    public void ApplyHintPenalty()
    {
        Score = Math.Max(0, Score - 2);
    }
}
