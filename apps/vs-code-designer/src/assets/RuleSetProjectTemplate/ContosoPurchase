//------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
//------------------------------------------------------------

namespace ContosoNamespace
{
    /// <summary>
    /// Example : purchase .NET fact class
    /// This can be added as an assembly in csproj, please refer UserAssembly example in csproj
    /// </summary>
    public class ContosoPurchase
    {
        /// <summary>
        /// Purchase amount
        /// </summary>
        public int PurchaseAmount {get; set;}

        /// <summary>
        /// Zip code
        /// </summary>
        public string ZipCode {get; set;}

        /// <summary>
        /// tax rate
        /// </summary>
        public float TaxRate {get; set;}

        /// <summary>
        /// Constructor for Purchase
        /// </summary>
        public ContosoPurchase(int purchaseAmount, string zipCode)
        {
            this.PurchaseAmount = purchaseAmount;
            this.ZipCode = zipCode;
        }

        /// <summary>
        /// Business logic to calculate sales tax
        /// </summary>
        public int GetSalesTax() => (int)((PurchaseAmount*TaxRate)/100);
    }
}