using System.Globalization;

namespace MapperExtensionsFunctions
{
    public class MappingFunctions
    {
        public string ToDecimalPoint(string input)
        {
            return double.Parse(input, new CultureInfo("en-US", false))
                .ToString("0.000", CultureInfo.CurrentCulture);
        }
    }
}
