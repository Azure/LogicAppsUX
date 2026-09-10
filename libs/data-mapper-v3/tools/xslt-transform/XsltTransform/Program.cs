using System;
using System.CodeDom.Compiler;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Runtime.Loader;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Xsl;
using System.Xml.XPath;
using Microsoft.CSharp;

/// <summary>
/// XSLT transform tool that handles msxsl:script by extracting C# code,
/// compiling it dynamically, and registering as extension objects.
/// Mimics BizTalk Server's Test Map transform engine.
/// Usage: XsltTransform <xsltPath> <inputXmlPath> <outputXmlPath> [extensionObjectXmlPath]
/// </summary>
class Program
{
    public static int Main(string[] args)
    {
        if (args.Length < 3)
        {
            Console.Error.WriteLine("Usage: XsltTransform <xsltPath> <inputXmlPath> <outputXmlPath> [extensionObjectXmlPath]");
            return 1;
        }

        string xsltPath = args[0];
        string inputPath = args[1];
        string outputPath = args[2];
        string? extensionObjectPath = args.Length > 3 ? args[3] : null;

        try
        {
            using var assemblyLoadScope = new TransformAssemblyLoadScope();
            string xsltContent = File.ReadAllText(xsltPath);

            // Extract script blocks and their namespace prefixes
            var scripts = ExtractScriptBlocks(xsltContent);
            
            // Remove msxsl:script blocks from XSLT for .NET Core compatibility
            string cleanXslt = RemoveScriptBlocks(xsltContent);
            
            // Compile scripts and create extension objects
            var argList = new XsltArgumentList();
            
            if (scripts.Count > 0)
            {
                foreach (var script in scripts)
                {
                    // Resolve namespace URI to prefix used in XPath expressions
                    string nsUri = script.NamespaceUri;
                    object? extensionObj = CompileScript(
                        script.Code,
                        script.Language,
                        assemblyLoadScope.LoadContext);
                    if (extensionObj != null)
                    {
                        argList.AddExtensionObject(nsUri, extensionObj);
                    }
                }
            }
            if (!string.IsNullOrEmpty(extensionObjectPath))
            {
                AddExtensionObjects(argList, extensionObjectPath, assemblyLoadScope);
            }

            // Load and transform
            var settings = new XsltSettings(enableDocumentFunction: true, enableScript: false);
            var resolver = new XmlUrlResolver();

            // Write clean XSLT to temp file
            string tempXsltPath = Path.Combine(Path.GetDirectoryName(xsltPath)!, 
                Path.GetFileNameWithoutExtension(xsltPath) + "_clean.xslt");
            File.WriteAllText(tempXsltPath, cleanXslt);

            try
            {
                var transform = new XslCompiledTransform();
                transform.Load(tempXsltPath, settings, resolver);

                using var inputReader = XmlReader.Create(inputPath);
                using var outputWriter = XmlWriter.Create(outputPath, transform.OutputSettings);
                transform.Transform(inputReader, argList, outputWriter);
            }
            finally
            {
                // Clean up temp file
                if (File.Exists(tempXsltPath))
                    File.Delete(tempXsltPath);
            }

            Console.WriteLine($"OK: {outputPath}");
            return 0;
        }
        catch (XsltException ex)
        {
            Console.Error.WriteLine($"XSLT Error (line {ex.LineNumber}, col {ex.LinePosition}): {ex.Message}");
            if (ex.InnerException != null)
                Console.Error.WriteLine($"  Inner: {ex.InnerException.Message}");
            return 2;
        }
        catch (XmlException ex)
        {
            Console.Error.WriteLine($"XML Error (line {ex.LineNumber}, col {ex.LinePosition}): {ex.Message}");
            return 3;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            if (ex.InnerException != null)
                Console.Error.WriteLine($"  Inner: {ex.InnerException.Message}");
            return 4;
        }
    }

    static void AddExtensionObjects(
        XsltArgumentList argList,
        string extensionObjectPath,
        TransformAssemblyLoadScope assemblyLoadScope)
    {
        var document = new XmlDocument();
        document.Load(extensionObjectPath);
        foreach (XmlElement element in document.SelectNodes("/ExtensionObjects/ExtensionObject")!)
        {
            string namespaceUri = element.GetAttribute("Namespace");
            string assemblyName = element.GetAttribute("AssemblyName");
            string className = element.GetAttribute("ClassName");
            if (string.IsNullOrWhiteSpace(namespaceUri) ||
                string.IsNullOrWhiteSpace(assemblyName) ||
                string.IsNullOrWhiteSpace(className))
            {
                throw new InvalidDataException("ExtensionObject requires Namespace, AssemblyName, and ClassName.");
            }

            string assemblyFile = File.Exists(assemblyName)
                ? assemblyName
                : assemblyName + ".dll";
            Assembly assembly = File.Exists(assemblyFile)
                ? assemblyLoadScope.LoadFromPath(assemblyFile)
                : Assembly.Load(new AssemblyName(assemblyName));
            Type type = assembly.GetType(className, throwOnError: true)!;
            foreach (XmlElement methodElement in element.SelectNodes("Method")!)
            {
                string methodName = methodElement.GetAttribute("Name");
                if (!int.TryParse(methodElement.GetAttribute("ParameterCount"), out int parameterCount) ||
                    parameterCount < 0)
                {
                    throw new InvalidDataException(
                        $"External method '{methodName}' has an invalid ParameterCount.");
                }
                bool hasCompatibleMethod = false;
                foreach (MethodInfo method in type.GetMethods(BindingFlags.Instance | BindingFlags.Public))
                {
                    if (method.Name == methodName &&
                        !method.ContainsGenericParameters &&
                        method.GetParameters().Length == parameterCount)
                    {
                        hasCompatibleMethod = true;
                        break;
                    }
                }
                if (!hasCompatibleMethod)
                {
                    throw new MissingMethodException(
                        type.FullName,
                        $"{methodName} with {parameterCount} parameter(s)");
                }
            }
            object instance = Activator.CreateInstance(type)
                ?? throw new InvalidOperationException($"Could not create extension object '{className}'.");
            argList.AddExtensionObject(namespaceUri, instance);
        }
    }

    class ScriptBlock
    {
        public string NamespaceUri { get; set; } = "";
        public string Language { get; set; } = "C#";
        public string Code { get; set; } = "";
    }

    static List<ScriptBlock> ExtractScriptBlocks(string xslt)
    {
        var scripts = new List<ScriptBlock>();
        // Match <msxsl:script language="..." implements-prefix="...">...</msxsl:script>
        var regex = new Regex(
            @"<msxsl:script\s+[^>]*implements-prefix=""([^""]+)""[^>]*>([\s\S]*?)</msxsl:script>",
            RegexOptions.IgnoreCase);
        
        var langRegex = new Regex(@"language=""([^""]+)""", RegexOptions.IgnoreCase);

        foreach (Match match in regex.Matches(xslt))
        {
            string prefix = match.Groups[1].Value;
            string code = match.Groups[2].Value;
            
            // Extract language
            string lang = "C#";
            var langMatch = langRegex.Match(match.Value);
            if (langMatch.Success)
                lang = langMatch.Groups[1].Value;

            // Strip CDATA wrapper
            code = Regex.Replace(code, @"<!\[CDATA\[([\s\S]*?)\]\]>", "$1").Trim();

            // Resolve prefix to namespace URI from stylesheet
            string nsUri = ResolveNamespaceUri(xslt, prefix);

            scripts.Add(new ScriptBlock { NamespaceUri = nsUri, Language = lang, Code = code });
        }

        return scripts;
    }

    static string ResolveNamespaceUri(string xslt, string prefix)
    {
        // Look for xmlns:prefix="uri" in the stylesheet element
        var nsRegex = new Regex($@"xmlns:{Regex.Escape(prefix)}=""([^""]+)""");
        var match = nsRegex.Match(xslt);
        return match.Success ? match.Groups[1].Value : $"http://schemas.microsoft.com/BizTalk/2003/Script/{prefix}";
    }

    static string RemoveScriptBlocks(string xslt)
    {
        // Remove msxsl:script blocks
        string result = Regex.Replace(xslt,
            @"<msxsl:script\s+[^>]*>[\s\S]*?</msxsl:script>",
            "", RegexOptions.IgnoreCase);
        return result;
    }

    static object? CompileScript(
        string code,
        string language,
        AssemblyLoadContext loadContext)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;
        if (!string.Equals(language, "C#", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(language, "CSharp", StringComparison.OrdinalIgnoreCase))
        {
            throw new NotSupportedException(
                $"Test Map does not support inline script language '{language}'.");
        }

        // Wrap the code in a class
        string className = "ScriptExtension_" + Guid.NewGuid().ToString("N").Substring(0, 8);
        string fullCode = $@"
using System;
using System.Collections;
using System.Text;
using System.Xml;
using System.Xml.XPath;

public class {className}
{{
    {code}
}}";

        try
        {
            // Use Roslyn to compile
            var syntaxTree = Microsoft.CodeAnalysis.CSharp.CSharpSyntaxTree.ParseText(fullCode);
            var references = new List<Microsoft.CodeAnalysis.MetadataReference>
            {
                Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
                Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
                Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(typeof(XmlDocument).Assembly.Location),
                Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(typeof(XPathNavigator).Assembly.Location),
                Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(typeof(System.Text.RegularExpressions.Regex).Assembly.Location),
                Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(typeof(System.Linq.Enumerable).Assembly.Location),
            };

            // Add runtime assembly references
            string runtimeDir = System.Runtime.InteropServices.RuntimeEnvironment.GetRuntimeDirectory();
            references.Add(Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(
                Path.Combine(runtimeDir, "System.Runtime.dll")));
            references.Add(Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(
                Path.Combine(runtimeDir, "System.Collections.dll")));
            references.Add(Microsoft.CodeAnalysis.MetadataReference.CreateFromFile(
                Path.Combine(runtimeDir, "netstandard.dll")));

            var compilation = Microsoft.CodeAnalysis.CSharp.CSharpCompilation.Create(
                assemblyName: className,
                syntaxTrees: new[] { syntaxTree },
                references: references,
                options: new Microsoft.CodeAnalysis.CSharp.CSharpCompilationOptions(
                    Microsoft.CodeAnalysis.OutputKind.DynamicallyLinkedLibrary));

            using var ms = new MemoryStream();
            var emitResult = compilation.Emit(ms);
            
            if (!emitResult.Success)
            {
                var errors = new StringBuilder();
                foreach (var diag in emitResult.Diagnostics)
                {
                    if (diag.Severity == Microsoft.CodeAnalysis.DiagnosticSeverity.Error)
                        errors.AppendLine(diag.GetMessage());
                }
                throw new InvalidOperationException($"Script compilation failed: {errors}");
            }

            ms.Seek(0, SeekOrigin.Begin);
            var assembly = loadContext.LoadFromStream(ms);
            var type = assembly.GetType(className);
            return type != null ? Activator.CreateInstance(type) : null;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Script compilation failed: {ex.Message}", ex);
        }
    }

    sealed class TransformAssemblyLoadScope : IDisposable
    {
        public TransformAssemblyLoadContext LoadContext { get; } =
            new TransformAssemblyLoadContext();

        public Assembly LoadFromPath(string assemblyPath)
        {
            return LoadContext.LoadExternalAssembly(Path.GetFullPath(assemblyPath));
        }

        public void Dispose()
        {
            LoadContext.Unload();
        }
    }

    sealed class TransformAssemblyLoadContext : AssemblyLoadContext
    {
        private readonly List<AssemblyDependencyResolver> resolvers = new();
        private readonly HashSet<string> probeDirectories =
            new(StringComparer.OrdinalIgnoreCase);

        public TransformAssemblyLoadContext()
            : base($"BizTalkDataMapperTransform-{Guid.NewGuid():N}", isCollectible: true)
        {
        }

        public Assembly LoadExternalAssembly(string assemblyPath)
        {
            string fullPath = Path.GetFullPath(assemblyPath);
            resolvers.Add(new AssemblyDependencyResolver(fullPath));
            probeDirectories.Add(Path.GetDirectoryName(fullPath)!);
            return LoadFromAssemblyPath(fullPath);
        }

        protected override Assembly? Load(AssemblyName assemblyName)
        {
            foreach (AssemblyDependencyResolver resolver in resolvers)
            {
                string? dependencyPath = resolver.ResolveAssemblyToPath(assemblyName);
                if (dependencyPath != null)
                {
                    return LoadFromAssemblyPath(dependencyPath);
                }
            }

            foreach (string directory in probeDirectories)
            {
                string candidate = Path.Combine(directory, assemblyName.Name + ".dll");
                if (File.Exists(candidate))
                {
                    return LoadFromAssemblyPath(candidate);
                }
            }

            return null;
        }

        protected override IntPtr LoadUnmanagedDll(string unmanagedDllName)
        {
            foreach (AssemblyDependencyResolver resolver in resolvers)
            {
                string? dependencyPath =
                    resolver.ResolveUnmanagedDllToPath(unmanagedDllName);
                if (dependencyPath != null)
                {
                    return LoadUnmanagedDllFromPath(dependencyPath);
                }
            }

            return IntPtr.Zero;
        }
    }

}