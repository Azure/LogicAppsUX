<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template name="country-label">
    <xsl:variable name="code" select="Code"/>
    <xsl:value-of select="document('../../data/countries.xml')/Countries/Country[@code=$code]/@name"/>
  </xsl:template>
</xsl:stylesheet>