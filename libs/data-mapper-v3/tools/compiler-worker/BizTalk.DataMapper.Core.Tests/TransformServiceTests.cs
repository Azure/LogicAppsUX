using BizTalk.DataMapper.Core;
using Xunit;

namespace BizTalk.DataMapper.Core.Tests;

public sealed class TransformServiceTests
{
    [Theory]
    [InlineData("Yes", true)]
    [InlineData("No", false)]
    [InlineData("Undefined", false)]
    [InlineData(null, false)]
    public void TransformSelectsLegacyProcessorOnlyForYes(string? useXslTransform, bool expectedLegacy)
    {
        const string xslt = """
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                            xmlns:msxsl="urn:schemas-microsoft-com:xslt"
                            xmlns:user="urn:test-script" xmlns:ext="urn:test-extension" version="1.0">
              <msxsl:script language="C#" implements-prefix="user"><![CDATA[
                public string Processor()
                {
                  return new System.Diagnostics.StackTrace().ToString().Contains("System.Xml.Xsl.XsltOld.") ? "legacy" : "compiled";
                }
              ]]></msxsl:script>
              <xsl:template match="/"><result><xsl:value-of select="user:Processor()"/>:<xsl:value-of select="ext:ToString()"/></result></xsl:template>
            </xsl:stylesheet>
            """;
        const string extensionXml = """
            <ExtensionObjects>
              <ExtensionObject Namespace="urn:test-extension" AssemblyName="mscorlib" ClassName="System.Version"/>
            </ExtensionObjects>
            """;

        TransformResult result = new TransformService().Transform(new TransformRequest(
            xslt, "<root/>", extensionXml, Path.GetTempPath(), UseXslTransform: useXslTransform));

        Assert.True(result.Success, result.Error);
        Assert.Contains($">{(expectedLegacy ? "legacy" : "compiled")}:0.0</result>", result.OutputXml);
    }

    [Theory]
    [InlineData("Contoso.CustomEngine, Contoso")]
    [InlineData(" ")]
    public void TransformRejectsCustomXsltEngine(string xsltEngine)
    {
        TransformResult result = new TransformService().Transform(new TransformRequest(
        "<not-xslt/>", "<root/>", null, Path.GetTempPath(), XsltEngine: xsltEngine));

        Assert.False(result.Success);
      Assert.Contains($"Unsupported XSLT engine '{xsltEngine}'", result.Error);
        Assert.Contains("Select '.Net Framework'", result.Error);
    }

    [Theory]
    [InlineData("2.0")]
    [InlineData("3.0")]
    public void TransformRejectsLegacyProcessorForXslt20OrLater(string version)
    {
        string xslt = $"""
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="{version}">
              <xsl:template match="/"><result/></xsl:template>
            </xsl:stylesheet>
            """;
        TransformResult result = new TransformService().Transform(new TransformRequest(
            xslt, "<root/>", null, Path.GetTempPath(), UseXslTransform: "Yes"));

        Assert.False(result.Success);
        Assert.Contains("supports only XSLT 1.0", result.Error);
        Assert.Contains("'No' or 'Undefined'", result.Error);
    }

  [Theory]
  [InlineData(false, null)]
  [InlineData(true, null)]
  [InlineData(false, "Yes")]
  [InlineData(true, "Yes")]
  public void TransformStagesFilesOutsideProjectAndCleansUp(bool fail, string? useXslTransform)
  {
    string projectDirectory = Path.Combine(Path.GetTempPath(), $"mapper-project-{Guid.NewGuid():N}");
    Directory.CreateDirectory(projectDirectory);
    try
    {
      const string xslt = """
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:msxsl="urn:schemas-microsoft-com:xslt"
                xmlns:user="urn:test-script" version="1.0">
          <msxsl:script language="C#" implements-prefix="user"><![CDATA[
          public string StagingDirectory()
          {
            string directory = System.IO.Path.GetDirectoryName(System.Environment.GetCommandLineArgs()[1]);
            System.IO.File.WriteAllText("staging-path.txt", directory);
            if (__FAIL__) { throw new System.Exception("Expected transform failure"); }
            return directory;
          }
          ]]></msxsl:script>
          <xsl:template match="/"><result><xsl:value-of select="user:StagingDirectory()"/></result></xsl:template>
        </xsl:stylesheet>
        """;

      TransformResult result = new TransformService().Transform(new TransformRequest(
        xslt.Replace("__FAIL__", fail ? "true" : "false"), "<root/>", null, projectDirectory,
        UseXslTransform: useXslTransform));

      Assert.Equal(!fail, result.Success);
      string markerPath = Path.Combine(projectDirectory, "staging-path.txt");
      string stagingDirectory = File.ReadAllText(markerPath);
      File.Delete(markerPath);
      Assert.Equal(Path.TrimEndingDirectorySeparator(Path.GetTempPath()), Path.GetDirectoryName(stagingDirectory));
      Assert.StartsWith(".biztalk-mapper-", Path.GetFileName(stagingDirectory));
      Assert.False(Directory.Exists(stagingDirectory));
      Assert.Empty(Directory.EnumerateFileSystemEntries(projectDirectory));
    }
    finally
    {
      Directory.Delete(projectDirectory, recursive: true);
    }
  }

  [Theory]
  [InlineData("1.0", false, null, null)]
  [InlineData("1.0", true, null, null)]
  [InlineData("2.0", false, null, null)]
  [InlineData("2.0", true, null, null)]
  [InlineData("1.0", false, null, "Yes")]
  [InlineData("1.0", true, null, "Yes")]
  [InlineData("1.0", true, ".Net Framework", "No")]
  [InlineData("2.0", true, ".Net Framework", "No")]
  [InlineData("2.0", true, "", "Undefined")]
  public void TransformResolvesProjectRelativeResources(
    string version, bool explicitStylesheetPath, string? xsltEngine, string? useXslTransform)
  {
    string projectDirectory = Path.Combine(Path.GetTempPath(), $"mapper-resources-{Guid.NewGuid():N}");
    string resourceDirectory = explicitStylesheetPath ? Path.Combine(projectDirectory, "stylesheets") : projectDirectory;
    Directory.CreateDirectory(resourceDirectory);
    try
    {
      File.WriteAllText(Path.Combine(resourceDirectory, "common.xslt"), """
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
          <xsl:template name="emit"><result><xsl:value-of select="document('data.xml')/data/value"/></result></xsl:template>
        </xsl:stylesheet>
        """);
      File.WriteAllText(Path.Combine(resourceDirectory, "data.xml"), "<data><value>relative-resource</value></data>");
      string xslt = $$"""
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="{{version}}">
          <xsl:include href="common.xslt"/>
          <xsl:template match="/"><xsl:call-template name="emit"/></xsl:template>
        </xsl:stylesheet>
        """;

      TransformResult result = new TransformService().Transform(new TransformRequest(
        xslt, "<root/>", null, projectDirectory,
        explicitStylesheetPath ? Path.Combine("stylesheets", "main.xslt") : null,
        xsltEngine, useXslTransform));

      Assert.True(result.Success, result.Error);
      Assert.Contains("<result>relative-resource</result>", result.OutputXml);
      Assert.Empty(Directory.EnumerateDirectories(projectDirectory, ".biztalk-mapper-*"));
    }
    finally
    {
      Directory.Delete(projectDirectory, recursive: true);
    }
  }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", "Undefined")]
    [InlineData(".Net Framework", "No")]
    [InlineData(null, "Yes")]
    public void TransformReturnsXmlOutput(string? xsltEngine, string? useXslTransform)
    {
        const string xslt = """
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
              <xsl:output omit-xml-declaration="yes"/>
              <xsl:template match="/"><result><xsl:value-of select="/root/value"/></result></xsl:template>
            </xsl:stylesheet>
            """;
        var service = new TransformService();

        TransformResult result = service.Transform(new TransformRequest(
            xslt,
            "<root><value>expected</value></root>",
            null,
            Path.GetTempPath(),
            XsltEngine: xsltEngine,
            UseXslTransform: useXslTransform));

        Assert.True(result.Success, result.Error);
        Assert.Contains("<result>expected</result>", result.OutputXml);
    }

    [Fact]
    public void TransformReportsInvalidStylesheet()
    {
        var service = new TransformService();

        TransformResult result = service.Transform(new TransformRequest(
            "<not-xslt/>",
            "<root/>",
            null,
            Path.GetTempPath()));

        Assert.False(result.Success);
        Assert.False(string.IsNullOrWhiteSpace(result.Error));
    }

    [Theory]
    [InlineData("C#", "public string Value() { return \"csharp\"; }", "csharp")]
    [InlineData("VB", "Public Function Value() As String\nReturn \"vb\"\nEnd Function", "vb")]
    [InlineData("JScript", "function Value() { return \"jscript\"; }", "jscript")]
    public void TransformExecutesInlineScripts(string language, string script, string expected)
    {
        string xslt = $"""
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                            xmlns:msxsl="urn:schemas-microsoft-com:xslt"
                            xmlns:user="urn:test-script"
                            version="1.0">
              <msxsl:script language="{language}" implements-prefix="user"><![CDATA[
            {script}
              ]]></msxsl:script>
              <xsl:template match="/"><result><xsl:value-of select="user:Value()"/></result></xsl:template>
            </xsl:stylesheet>
            """;
        var service = new TransformService();

        TransformResult result = service.Transform(new TransformRequest(
            xslt,
            "<root/>",
            null,
            Path.GetTempPath()));

        Assert.True(result.Success, result.Error);
        Assert.Contains($">{expected}</result>", result.OutputXml);
    }

    [Fact]
    public void TransformReportsScriptCompilationErrors()
    {
        const string xslt = """
            <?xml version="1.0" encoding="utf-16"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                            xmlns:msxsl="urn:schemas-microsoft-com:xslt"
                            xmlns:user="urn:test-script"
                            version="1.0">
              <msxsl:script language="VB" implements-prefix="user"><![CDATA[
            Public Function Broken( As String
              ]]></msxsl:script>
              <xsl:template match="/"><result><xsl:value-of select="user:Broken()"/></result></xsl:template>
            </xsl:stylesheet>
            """;
        var service = new TransformService();

        TransformResult result = service.Transform(new TransformRequest(
            xslt,
            "<root/>",
            null,
            Path.GetTempPath()));

        Assert.False(result.Success);
        Assert.False(string.IsNullOrWhiteSpace(result.Error));
    }

    [Fact]
    public void TransformExecutesXslt20Stylesheet()
    {
        const string xslt = """
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
              <xsl:output omit-xml-declaration="yes"/>
              <xsl:template match="/">
                <result>
                  <xsl:value-of select="string-join(/root/value, '|')"/>
                </result>
              </xsl:template>
            </xsl:stylesheet>
            """;
        var service = new TransformService();

        TransformResult result = service.Transform(new TransformRequest(
            xslt,
            "<root><value>one</value><value>two</value></root>",
            null,
            Path.GetTempPath()));

        Assert.True(result.Success, result.Error);
        Assert.Contains("<result>one|two</result>", result.OutputXml);
    }

    [Fact]
    public void TransformRejectsXslt20WithMicrosoftScript()
    {
        const string xslt = """
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                            xmlns:msxsl="urn:schemas-microsoft-com:xslt"
                            xmlns:user="urn:test-script"
                            version="2.0">
              <msxsl:script language="C#" implements-prefix="user">
                public string Value() { return "value"; }
              </msxsl:script>
              <xsl:template match="/"><result><xsl:value-of select="user:Value()"/></result></xsl:template>
            </xsl:stylesheet>
            """;
        var service = new TransformService();

        TransformResult result = service.Transform(new TransformRequest(
            xslt,
            "<root/>",
            null,
            Path.GetTempPath()));

        Assert.False(result.Success);
        Assert.Contains("cannot be combined", result.Error);
    }

    [Fact]
    public void TransformLoadsExternalAssemblyInIsolatedContext()
    {
        const string namespaceUri = "urn:test-external";
        const string xslt = """
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                            xmlns:ext="urn:test-external"
                            exclude-result-prefixes="ext"
                            version="1.0">
              <xsl:output omit-xml-declaration="yes"/>
              <xsl:template match="/">
                <result><xsl:value-of select="ext:Value()"/></result>
              </xsl:template>
            </xsl:stylesheet>
            """;
        string extensionXml = $"""
            <?xml version="1.0" encoding="utf-16"?>
            <ExtensionObjects>
              <ExtensionObject Namespace="{namespaceUri}"
                               AssemblyName="{typeof(ExternalTransformFunctions).Assembly.Location}"
                               ClassName="{typeof(ExternalTransformFunctions).FullName}">
                <Method Name="Value" ParameterCount="0" />
              </ExtensionObject>
            </ExtensionObjects>
            """;
        var service = new TransformService();

        TransformResult result = service.Transform(new TransformRequest(
            xslt,
            "<?xml version=\"1.0\" encoding=\"utf-16\"?><root/>",
            extensionXml,
            Path.GetTempPath()));

        Assert.True(result.Success, result.Error);
        Assert.Contains("<result>external</result>", result.OutputXml);
    }
}

public sealed class ExternalTransformFunctions
{
    public string Value() => "external";
}
