using System;
using System.Collections.Generic;

namespace StoreValuesHelperClass
{
    public class StoreValues
    {
        [ThreadStatic]
        public static Dictionary<string, string> Data;

        public static string GetDataValue(string key)
        {
            string value;
            return Data != null && Data.TryGetValue(key, out value) ? value : string.Empty;
        }

        public static void SetDataValue(string key, string value)
        {
            if (Data == null)
            {
                Data = new Dictionary<string, string>();
            }
            Data[key] = value;
        }
    }
}
