<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes"/>
  
  <!-- Root template matching source schema -->
  <xsl:template match="/SourceRoot">
    <TargetRoot>
      <!-- Simple value mapping -->
      <CustomerInfo>
        <Name>
          <xsl:value-of select="Customer/Name"/>
        </Name>
        <Email>
          <xsl:value-of select="Customer/Email"/>
        </Email>
      </CustomerInfo>
      
      <!-- Loop through orders -->
      <Orders>
        <xsl:for-each select="Customer/Orders/Order">
          <OrderItem>
            <OrderId>
              <xsl:value-of select="@id"/>
            </OrderId>
            <Product>
              <xsl:value-of select="ProductName"/>
            </Product>
            <Quantity>
              <xsl:value-of select="Quantity"/>
            </Quantity>
            <!-- Conditional mapping -->
            <xsl:if test="Price > 100">
              <HighValue>true</HighValue>
            </xsl:if>
          </OrderItem>
        </xsl:for-each>
      </Orders>
      
      <!-- Static value -->
      <ProcessedDate>
        <xsl:text>2024-01-01</xsl:text>
      </ProcessedDate>
    </TargetRoot>
  </xsl:template>
</xsl:stylesheet>