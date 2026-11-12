# Custom XSLT Relative Paths

Manual sample for Test Map with a custom stylesheet path. Keep this entire folder together when copying it into your mapper workspace.

1. Open `CustomXsltPaths.btm` in the BTM mapper.
2. Run Test Map and select `input.xml`.
3. Compare the output with the XML below. Whitespace and the XML declaration may differ.

The canvas intentionally has no links: the map uses `xslt/main.xsl` instead of generated mapping logic. The input and output schemas are `Source.xsd` and `Target.xsd`.

The stylesheet includes `templates/items.xsl`, which includes `common/labels.xsl`. The nested stylesheet reads `../../data/countries.xml` using `document()`. These references must resolve against each stylesheet's own location, not the BTM directory or a temporary generated stylesheet directory. No extension assembly is required.

## Import Into A Project

Use Import Map to select the original `CustomXsltPaths.btm`. The imported project should contain:

```text
CustomXsltPaths.btm
Schemas/
  Source.xsd
  Target.xsd
Artifacts/
  CustomXsltPaths/
    main.xsl
    templates/
      items.xsl
      common/
        labels.xsl
    data/
      countries.xml
```

The imported BTM should reference `Schemas/Source.xsd`, `Schemas/Target.xsd`, and `Artifacts/CustomXsltPaths/main.xsl`. Run Test Map on the imported map using the original `input.xml`; the input instance is not an import dependency.

Import the same original BTM again. It should become `CustomXsltPaths(1).btm`, reuse the identical schemas without copying them again, and have its own `Artifacts/CustomXsltPaths(1)` folder. Identical reused schemas are shared by the maps.

For the same-schema-name scenario, import two differently named maps from separate folders, each with a different `Source.xsd`. The second import should create `Schemas/Source_<map-name>.xsd` and update its BTM reference, without replacing the first map's schema. XSD include/import references must also follow any renamed dependencies. If the suffixed filename already contains different content, a numeric suffix is added rather than overwriting it.

Only discovered dependencies are copied, not entire source directories. Dynamic `document()` references and remote resources produce import warnings and may need manual copying or reference updates.

## Expected Output

```xml
<?xml version="1.0" encoding="utf-8"?>
<Result>
  <Item>
    <Code>US</Code>
    <Label>United States</Label>
    <Value>first-item</Value>
  </Item>
  <Item>
    <Code>IN</Code>
    <Label>India</Label>
    <Value>second-item</Value>
  </Item>
  <Item>
    <Code>GB</Code>
    <Label>United Kingdom</Label>
    <Value>third-item</Value>
  </Item>
</Result>
```

## Unreadable Stylesheet

Temporarily rename the stylesheet referenced by the open BTM (`xslt/main.xsl` in the original sample, or `Artifacts/CustomXsltPaths/main.xsl` after import) to `main.xsl.bak`, run Test Map again, then restore the filename. The error should contain `Custom XSLT file could not be read:` followed by the resolved stylesheet path, rather than an XML parse error for an empty stylesheet.

This sample exercises XSLT 1.0 relative includes and `document()` resolution. It does not exercise script extensions, XSLT 2.0/Saxon dispatch, external assemblies, or file-encoding variations.