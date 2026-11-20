<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:msxsl="urn:schemas-microsoft-com:xslt" exclude-result-prefixes="msxsl"
>
    <xsl:output method="xml" indent="yes"/>

  <xsl:key name="Customer" use="." match="Form/FullName/text()"/>
  
    <xsl:template match="@* | node()">
      <ApplicationForms xmlns:ns0="http://BizTalkMapperContentFilterPattern.ApplicationForms">
       <!-- <mamma>
          <xsl:value-of select="key('Customer','Sandro Pereira')[last()]"/>
        </mamma>
        -->
        <xsl:variable name="sorted">
          <Forms>
        <xsl:apply-templates select="Form">
          
          <xsl:sort select="concat(FullName,RequestDate)"/>
         
        </xsl:apply-templates>
          </Forms>
        </xsl:variable>

        <xsl:variable name="sortedNodeSet" select="msxsl:node-set($sorted)/Forms"/>
        
        <xsl:for-each select="$sortedNodeSet/*">
          <xsl:if test="(FullName != following-sibling::*[1]/FullName) or (position() = last())">
            <xsl:copy-of select="."/>
          </xsl:if>
        </xsl:for-each>
        <!--
      <xsl:for-each select="Form">
        <xsl:sort select="concat(FullName,RequestDate)"/>

        <xsl:element name="FullName">
          <xsl:value-of select="FullName"/>
        </xsl:element>
        <xsl:element name="RequestDate">
          <xsl:value-of select="RequestDate"/>
        </xsl:element>
        <xsl:variable name="flName" select="FullName"/>
        
        <xsl:if test="FullName != following-sibling::*[1]/FullName">
          <sibDate>
            <xsl:element name="FullName">
              <xsl:value-of select="FullName"/>
            </xsl:element>
            <xsl:element name="RequestDate">
              <xsl:value-of select="RequestDate"/>
            </xsl:element>
            
          </sibDate>
          
        </xsl:if>
       
            
        
          
        
        
      </xsl:for-each>
        -->
      </ApplicationForms>
    </xsl:template>
  <xsl:template name="SortFrom" match="Form">
    <xsl:copy-of select="."/>
  </xsl:template>
</xsl:stylesheet>
