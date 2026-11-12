# Conditions Inside Loops: Manual Verification

These are standalone manual samples, not automated tests. Keep all files together
so the maps can resolve their relative schema references.

## Run

1. Use the Standard extension built from the current source with the compiler
   fixes. The previously packaged VSIX predates these fixes. Rebuild and restart
   the Extension Development Host before checking the samples.
2. Open `NestedLoopCondition.btm` in the visual data mapper. If necessary, use
   **Reopen Editor With** to select the Standard extension's BTM mapper.
3. Confirm that both source and target trees load. There are two Looping
   functoids, one Equal functoid comparing `FlagA` to `Y`, and one Value Mapping.
4. Choose **Test Map** and select `input.xml` as the input file. Save the output
   when prompted, then inspect the resulting XML.
5. Repeat with `ChainedConditions.btm` and the same `input.xml`. Save its output
   separately so you can compare both results.

Compare element structure and values, ignoring indentation, the XML declaration,
and unused namespace declarations. These expected outputs describe the intended
behavior; the transformations have not been executed as part of creating these
samples.

## 1. Condition Inside Nested Loops

`NestedLoopCondition.btm` maps `Source/Order` and `Source/Order/Line` through
separate Looping functoids. Within each line, it emits `Value` only when
`FlagA = Y`. The first line deliberately fails this condition; later lines pass.
There are no unconditional sibling mappings that could mask premature parent
suppression.

Expected output:

```xml
<Result>
  <Order>
    <Line><Value>both-true</Value></Line>
    <Line><Value>A-true-B-false</Value></Line>
  </Order>
  <Order>
    <Line><Value>second-order</Value></Line>
  </Order>
</Result>
```

Pass criteria:

- Both orders are present even though the first input line has `FlagA = N`.
- The first order contains exactly two lines, with the values above in that order.
- The second order contains exactly one line; values must not leak between orders.
- No rejected line, empty `Line`, or empty `Value` element is emitted.

Before the loop-boundary fix, the first order can disappear because its first
line's false condition is incorrectly evaluated as a condition on the whole order.

## 2. Chained Conditions Inside Loops

`ChainedConditions.btm` has the same two loops, but chains two Value Mapping
functoids:

```text
Equal(FlagA, "Y") -> ValueMapping1 condition
Value            -> ValueMapping1 value
Equal(FlagB, "Y") -> ValueMapping2 condition
ValueMapping1    -> ValueMapping2 value
ValueMapping2    -> Result/Order/Line/Value
```

Both conditions must pass for a line to appear. The first order covers all four
combinations:

| FlagA | FlagB | Emit a line? | Input value |
| --- | --- | --- | --- |
| N | Y | No | A-false-B-true |
| Y | Y | Yes | both-true |
| Y | N | No | A-true-B-false |
| N | N | No | both-false |

Expected output:

```xml
<Result>
  <Order>
    <Line><Value>both-true</Value></Line>
  </Order>
  <Order>
    <Line><Value>second-order</Value></Line>
  </Order>
</Result>
```

Pass criteria:

- Exactly two orders, each with exactly one line and one nonempty value.
- No empty `Line` or `Value` for either mixed true/false combination.
- Neither `A-false-B-true` nor `A-true-B-false` appears in the output.

Before the chained-guard fix, combining prerequisites with OR can emit empty
target elements when only one condition is true.

## Optional Variations

- Change the first line's `FlagA` to `Y`: it should now appear in both maps.
- Change `FlagB` to `N` on `both-true`: the first map should still include that
  value, while the chained map should exclude it.
- Make every line in the first order fail `FlagA`: no `Line` should be emitted
  for that order. An empty outer `Order` is allowed because outer wrappers are
  not suppressed using a scalar condition from a different loop context.
- Turn **Preserve Sequence Order** on and repeat. These maps have one mapped
  child branch at each level, so the results should stay the same; this does not
  exercise the separate multi-branch sequence-order loop.