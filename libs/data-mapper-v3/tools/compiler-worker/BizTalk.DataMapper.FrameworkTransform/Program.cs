using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Xml;
using System.Xml.Xsl;
using Saxon.Api;

namespace BizTalk.DataMapper.FrameworkTransform
{
    internal static class Program
    {
        public static int Main(string[] args)
        {
            if (args.Length < 3)
            {
                Console.Error.WriteLine(
                    "Usage: FrameworkTransform <xsltPath> <inputXmlPath> <outputXmlPath> [extensionObjectXmlPath]");
                return 1;
            }

            try
            {
                bool useSaxon = RequiresSaxon(args[0]);
                if (useSaxon && ContainsScriptBlock(args[0]))
                {
                    throw new NotSupportedException(
                        "XSLT 2.0 or later cannot be combined with Microsoft msxsl:script blocks.");
                }

                if (useSaxon)
                {
                    TransformWithSaxon(args);
                    Console.WriteLine("OK: " + args[2]);
                    return 0;
                }

                var arguments = new XsltArgumentList();
                if (args.Length > 3 && !string.IsNullOrWhiteSpace(args[3]))
                {
                    AddExtensionObjects(arguments, args[3], GetScriptNamespaces(args[0]));
                }

                var transform = new XslCompiledTransform();
                transform.Load(
                    args[0],
                    new XsltSettings(enableDocumentFunction: true, enableScript: true),
                    new XmlUrlResolver());

                using (XmlReader input = XmlReader.Create(args[1]))
                using (XmlWriter output = XmlWriter.Create(args[2], transform.OutputSettings))
                {
                    transform.Transform(input, arguments, output);
                }

                Console.WriteLine("OK: " + args[2]);
                return 0;
            }
            catch (XsltException exception)
            {
                Console.Error.WriteLine(
                    "XSLT Error (line {0}, col {1}): {2}",
                    exception.LineNumber,
                    exception.LinePosition,
                    exception.Message);
                WriteInnerException(exception);
                return 2;
            }
            catch (XmlException exception)
            {
                Console.Error.WriteLine(
                    "XML Error (line {0}, col {1}): {2}",
                    exception.LineNumber,
                    exception.LinePosition,
                    exception.Message);
                return 3;
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine("Error: " + exception.Message);
                WriteInnerException(exception);
                return 4;
            }
        }

        private static void TransformWithSaxon(string[] args)
        {
            var processor = new Processor();
            if (args.Length > 3 && !string.IsNullOrWhiteSpace(args[3]))
            {
                AddSaxonExtensionObjects(processor, args[3]);
            }

            XsltCompiler compiler = processor.NewXsltCompiler();
            XsltExecutable executable = compiler.Compile(new Uri(Path.GetFullPath(args[0])));
            Xslt30Transformer transformer = executable.Load30();
            transformer.InputXmlResolver = new XmlUrlResolver();

            Serializer serializer = processor.NewSerializer();
            using (FileStream output = File.Create(args[2]))
            using (FileStream input = File.OpenRead(args[1]))
            {
                serializer.SetOutputStream(output);
                transformer.ApplyTemplates(input, serializer);
                serializer.Close();
            }
        }

        private static bool RequiresSaxon(string xsltPath)
        {
            var document = new XmlDocument();
            document.Load(xsltPath);
            XmlElement root = document.DocumentElement;
            if (root == null ||
                root.NamespaceURI != "http://www.w3.org/1999/XSL/Transform")
            {
                return false;
            }

            Version version;
            return Version.TryParse(root.GetAttribute("version"), out version) &&
                version.Major >= 2;
        }

        private static bool ContainsScriptBlock(string xsltPath)
        {
            var document = new XmlDocument();
            document.Load(xsltPath);
            return document.SelectSingleNode(
                "//*[local-name()='script' and namespace-uri()='urn:schemas-microsoft-com:xslt']") != null;
        }

        private static void AddSaxonExtensionObjects(Processor processor, string path)
        {
            foreach (object instance in LoadExtensionObjects(path))
            {
                var function = instance as ExtensionFunction;
                if (function != null)
                {
                    processor.RegisterExtensionFunction(function);
                    continue;
                }

                var definition = instance as ExtensionFunctionDefinition;
                if (definition != null)
                {
                    processor.RegisterExtensionFunction(definition);
                    continue;
                }

                throw new InvalidDataException(
                    "Saxon extension classes must implement ExtensionFunction or ExtensionFunctionDefinition.");
            }
        }

        private static HashSet<string> GetScriptNamespaces(string xsltPath)
        {
            var document = new XmlDocument();
            document.Load(xsltPath);
            var namespaces = new XmlNamespaceManager(document.NameTable);
            namespaces.AddNamespace("msxsl", "urn:schemas-microsoft-com:xslt");
            var result = new HashSet<string>(StringComparer.Ordinal);
            XmlNodeList scripts = document.SelectNodes("//msxsl:script", namespaces);
            if (scripts == null)
            {
                return result;
            }

            foreach (XmlElement script in scripts)
            {
                string prefix = script.GetAttribute("implements-prefix");
                string namespaceUri = script.GetNamespaceOfPrefix(prefix);
                if (!string.IsNullOrEmpty(namespaceUri))
                {
                    result.Add(namespaceUri);
                }
            }
            return result;
        }

        private static void AddExtensionObjects(
            XsltArgumentList arguments,
            string path,
            HashSet<string> scriptNamespaces)
        {
            var document = new XmlDocument();
            document.Load(path);
            XmlNodeList elements = document.SelectNodes("/ExtensionObjects/ExtensionObject");
            if (elements == null)
            {
                return;
            }

            foreach (XmlElement element in elements)
            {
                string namespaceUri = element.GetAttribute("Namespace");
                if (scriptNamespaces.Contains(namespaceUri))
                {
                    continue;
                }
                arguments.AddExtensionObject(namespaceUri, CreateExtensionObject(element));
            }
        }

        private static object[] LoadExtensionObjects(string path)
        {
            var document = new XmlDocument();
            document.Load(path);
            XmlNodeList elements = document.SelectNodes("/ExtensionObjects/ExtensionObject");
            if (elements == null)
            {
                return new object[0];
            }

            var instances = new object[elements.Count];
            int index = 0;
            foreach (XmlElement element in elements)
            {
                instances[index++] = CreateExtensionObject(element);
            }
            return instances;
        }

        private static object CreateExtensionObject(XmlElement element)
        {
            string namespaceUri = element.GetAttribute("Namespace");
            string assemblyName = element.GetAttribute("AssemblyName");
            string className = element.GetAttribute("ClassName");
            if (string.IsNullOrWhiteSpace(namespaceUri) ||
                string.IsNullOrWhiteSpace(assemblyName) ||
                string.IsNullOrWhiteSpace(className))
            {
                throw new InvalidDataException(
                    "ExtensionObject requires Namespace, AssemblyName, and ClassName.");
            }

            string assemblyFile = File.Exists(assemblyName)
                ? assemblyName
                : assemblyName + ".dll";
            Assembly assembly = File.Exists(assemblyFile)
                ? Assembly.LoadFrom(Path.GetFullPath(assemblyFile))
                : Assembly.Load(new AssemblyName(assemblyName));
            Type type = assembly.GetType(className, throwOnError: true);
            return Activator.CreateInstance(type);
        }

        private static void WriteInnerException(Exception exception)
        {
            Exception inner = exception.InnerException;
            while (inner != null)
            {
                Console.Error.WriteLine("  Inner: " + inner.Message);
                inner = inner.InnerException;
            }
        }
    }
}
