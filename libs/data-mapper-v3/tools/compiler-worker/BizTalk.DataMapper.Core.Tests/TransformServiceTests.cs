using BizTalk.DataMapper.Core;
using Xunit;

namespace BizTalk.DataMapper.Core.Tests;

public sealed class TransformServiceTests
{
    [Fact]
    public void TransformReturnsXmlOutput()
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
            Path.GetTempPath()));

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
