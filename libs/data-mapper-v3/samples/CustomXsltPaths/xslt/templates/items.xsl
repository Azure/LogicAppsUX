<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:include href="common/labels.xsl"/>
  <xsl:template match="Item">
    <Item>
      <Code><xsl:value-of select="Code"/></Code>
      <Label><xsl:call-template name="country-label"/></Label>
      <Value><xsl:value-of select="Value"/></Value>
    </Item>
  </xsl:template>
</xsl:stylesheet>