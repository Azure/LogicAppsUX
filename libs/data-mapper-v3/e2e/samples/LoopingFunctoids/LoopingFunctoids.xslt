<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:msxsl="urn:schemas-microsoft-com:xslt"
    xmlns:var="http://schemas.microsoft.com/BizTalk/2003/var"
    xmlns:s0="urn:biztalk-looping-source"
    xmlns:ns0="urn:biztalk-looping-target" exclude-result-prefixes="msxsl var s0" version="1.0">
  <xsl:output omit-xml-declaration="yes" method="xml" version="1.0" encoding="UTF-8" />

  <xsl:template match="/">
    <xsl:apply-templates select="/s0:Root" />
  </xsl:template>

  <xsl:template match="/s0:Root">
    <ns0:Root>
      <xsl:for-each select="*">
        <xsl:if test="self::s0:Items">
          <xsl:for-each select=".">
            <ns0:LoopLine>
              <xsl:variable name="var:v1" select="position()" />
              <ns0:Position>
                <xsl:value-of select="$var:v1" />
              </ns0:Position>
              <xsl:if test="s0:Value">
                <ns0:Value>
                  <xsl:value-of select="s0:Value/text()" />
                </ns0:Value>
              </xsl:if>
            </ns0:LoopLine>
          </xsl:for-each>
        </xsl:if>
        <xsl:if test="self::s0:OptionalItems">
          <xsl:for-each select=".">
            <xsl:if test="s0:Value">
              <ns0:ExistingLine>
                <xsl:if test="s0:Value">
                  <ns0:Value>
                    <xsl:value-of select="s0:Value/text()" />
                  </ns0:Value>
                </xsl:if>
              </ns0:ExistingLine>
            </xsl:if>
          </xsl:for-each>
        </xsl:if>
        <xsl:if test="self::s0:Items">
          <xsl:for-each select=".">
            <ns0:TableLine>
              <xsl:variable name="var:v2" select="s0:Value/text()" />
              <ns0:Value>
                <xsl:value-of select="$var:v2" />
              </ns0:Value>
            </ns0:TableLine>
            <ns0:TableLine>
              <xsl:variable name="var:v3" select="'Fixed table row'" />
              <ns0:Value>
                <xsl:value-of select="$var:v3" />
              </ns0:Value>
            </ns0:TableLine>
          </xsl:for-each>
        </xsl:if>
      </xsl:for-each>
    </ns0:Root>
  </xsl:template>
</xsl:stylesheet>
