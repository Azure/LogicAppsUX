<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:include href="templates/items.xsl"/>
  <xsl:output method="xml" encoding="utf-8" indent="yes"/>
  <xsl:template match="/Source">
    <Result>
      <xsl:apply-templates select="Item"/>
    </Result>
  </xsl:template>
</xsl:stylesheet>