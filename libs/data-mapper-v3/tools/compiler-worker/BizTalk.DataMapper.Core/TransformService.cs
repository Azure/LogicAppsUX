using System.Text;
using System.Diagnostics;
using System.Xml;

namespace BizTalk.DataMapper.Core;

public sealed record TransformRequest(
    string Xslt,
    string InputXml,
    string? ExtensionObjectXml,
    string? WorkingDirectory,
    string? StylesheetPath = null,
    string? XsltEngine = null,
    string? UseXslTransform = null);

public sealed record TransformResult(
    bool Success,
    string? OutputXml,
    string? Error,
    string Diagnostics);

public sealed class TransformService
{
    private static bool ContainsExtensionObjects(string? extensionObjectXml)
    {
        if (string.IsNullOrWhiteSpace(extensionObjectXml))
        {
            return false;
        }
        var document = new XmlDocument();
        document.LoadXml(extensionObjectXml);
        return document.SelectSingleNode("/ExtensionObjects/ExtensionObject") is not null;
    }

    public TransformResult Transform(TransformRequest request)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Xslt);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.InputXml);

        if (!string.IsNullOrEmpty(request.XsltEngine) && request.XsltEngine != ".Net Framework")
        {
            string message = $"Unsupported XSLT engine '{request.XsltEngine}'. Custom XSLT engine types are not supported. Select '.Net Framework' or clear XsltEngine to use automatic selection.";
            return new TransformResult(false, null, message, message);
        }

        bool useLegacyTransform = string.Equals(request.UseXslTransform, "Yes", StringComparison.OrdinalIgnoreCase);
        bool requiresXslt20 = RequiresXslt20Processor(request.Xslt);
        if (useLegacyTransform && requiresXslt20)
        {
            const string message = "UseXslTransform='Yes' selects the legacy System.Xml.Xsl.XslTransform processor, which supports only XSLT 1.0. Set UseXslTransform to 'No' or 'Undefined' to run XSLT 2.0 or later.";
            return new TransformResult(false, null, message, message);
        }

        string workingDirectory = string.IsNullOrWhiteSpace(request.WorkingDirectory)
            ? Path.GetTempPath()
            : Path.GetFullPath(request.WorkingDirectory);
        Directory.CreateDirectory(workingDirectory);

        string operationDirectory = Path.Combine(
            Path.GetTempPath(),
            $".biztalk-mapper-{Guid.NewGuid():N}");
        Directory.CreateDirectory(operationDirectory);

        string xsltPath = Path.Combine(operationDirectory, "map.xslt");
        string inputPath = Path.Combine(operationDirectory, "input.xml");
        string outputPath = Path.Combine(operationDirectory, "output.xml");
        string? extensionPath = request.ExtensionObjectXml is null
            ? null
            : Path.Combine(operationDirectory, "extension.xml");

        var standardOutput = new StringWriter();
        var standardError = new StringWriter();
        TextWriter previousOutput = Console.Out;
        TextWriter previousError = Console.Error;
        string previousDirectory = Environment.CurrentDirectory;

        try
        {
            string stylesheetBaseUri = new Uri(Path.GetFullPath(Path.Combine(
                workingDirectory,
                string.IsNullOrWhiteSpace(request.StylesheetPath) ? "map.xslt" : request.StylesheetPath))).AbsoluteUri;
            WriteXmlText(xsltPath, request.Xslt);
            WriteXmlText(inputPath, request.InputXml);
            if (extensionPath is not null)
            {
                WriteXmlText(extensionPath, request.ExtensionObjectXml!);
            }

            string? frameworkHost = FindFrameworkTransformHost();
            bool requiresFrameworkHost =
                request.XsltEngine == ".Net Framework" ||
                useLegacyTransform ||
                ContainsScriptBlock(request.Xslt) ||
                requiresXslt20 ||
                ContainsExtensionObjects(request.ExtensionObjectXml);
            if (requiresFrameworkHost)
            {
                if (frameworkHost is null)
                {
                    const string message =
                        "The packaged .NET Framework transform host required for the selected engine, legacy XslTransform, scripts, extension objects, or XSLT 2.0 or later was not found.";
                    return new TransformResult(false, null, message, message);
                }

                return RunFrameworkTransform(
                    frameworkHost,
                    xsltPath,
                    inputPath,
                    outputPath,
                    extensionPath,
                    stylesheetBaseUri,
                    workingDirectory,
                    request.UseXslTransform);
            }

            Console.SetOut(standardOutput);
            Console.SetError(standardError);
            Environment.CurrentDirectory = workingDirectory;

            var args = new List<string> { xsltPath, inputPath, outputPath, extensionPath ?? "", stylesheetBaseUri };

            int exitCode = global::Program.Main(args.ToArray());
            string diagnostics = JoinDiagnostics(standardOutput, standardError);
            if (exitCode != 0)
            {
                return new TransformResult(false, null, diagnostics, diagnostics);
            }
            if (!File.Exists(outputPath))
            {
                const string message = "Transform completed without producing output.";
                return new TransformResult(false, null, message, diagnostics);
            }

            return new TransformResult(
                true,
                File.ReadAllText(outputPath),
                null,
                diagnostics);
        }
        catch (Exception exception)
        {
            return new TransformResult(
                false,
                null,
                exception.Message,
                JoinDiagnostics(standardOutput, standardError));
        }
        finally
        {
            Environment.CurrentDirectory = previousDirectory;
            Console.SetOut(previousOutput);
            Console.SetError(previousError);
            try
            {
                Directory.Delete(operationDirectory, recursive: true);
            }
            catch (IOException)
            {
            }
            catch (UnauthorizedAccessException)
            {
            }
        }
    }

    private static bool RequiresXslt20Processor(string xslt)
    {
        try
        {
            var document = new XmlDocument();
            document.LoadXml(xslt);
            XmlElement? root = document.DocumentElement;
            return root is not null &&
                root.NamespaceURI == "http://www.w3.org/1999/XSL/Transform" &&
                Version.TryParse(root.GetAttribute("version"), out Version? version) &&
                version.Major >= 2;
        }

        catch (XmlException)
        {
            return false;
        }
    }

    private static void WriteXmlText(string path, string content)
    {
        string normalized = System.Text.RegularExpressions.Regex.Replace(
            content.TrimStart('\uFEFF'),
            @"\A(\s*<\?xml\b[^>]*\bencoding\s*=\s*)(['""])[^'""]+\2",
            "$1\"utf-8\"",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        File.WriteAllText(path, normalized, new UTF8Encoding(false));
    }

    private static string JoinDiagnostics(StringWriter output, StringWriter error)
    {
        return string.Join(
            Environment.NewLine,
            new[] { output.ToString().Trim(), error.ToString().Trim() }
                .Where(value => value.Length > 0));
    }

    private static bool ContainsScriptBlock(string xslt)
    {
        try
        {
            var document = new XmlDocument();
            document.LoadXml(xslt);
            return document.SelectSingleNode(
                "//*[local-name()='script' and namespace-uri()='urn:schemas-microsoft-com:xslt']") is not null;
        }
        catch (XmlException)
        {
            return xslt.Contains("<msxsl:script", StringComparison.OrdinalIgnoreCase);
        }
    }

    private static TransformResult RunFrameworkTransform(
        string hostPath,
        string xsltPath,
        string inputPath,
        string outputPath,
        string? extensionPath,
        string stylesheetBaseUri,
        string workingDirectory,
        string? useXslTransform)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = hostPath,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = workingDirectory
        };
        startInfo.ArgumentList.Add(xsltPath);
        startInfo.ArgumentList.Add(inputPath);
        startInfo.ArgumentList.Add(outputPath);
        startInfo.ArgumentList.Add(extensionPath ?? "");
        startInfo.ArgumentList.Add(stylesheetBaseUri);
        startInfo.ArgumentList.Add(useXslTransform ?? "");

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start the .NET Framework transform host.");
        Task<string> outputTask = process.StandardOutput.ReadToEndAsync();
        Task<string> errorTask = process.StandardError.ReadToEndAsync();
        if (!process.WaitForExit(60_000))
        {
            process.Kill(entireProcessTree: true);
            return new TransformResult(
                false,
                null,
                "The .NET Framework transform timed out.",
                "The .NET Framework transform timed out.");
        }
        string output = outputTask.GetAwaiter().GetResult();
        string error = errorTask.GetAwaiter().GetResult();

        string diagnostics = JoinDiagnostics(output, error);
        if (process.ExitCode != 0)
        {
            return new TransformResult(false, null, diagnostics, diagnostics);
        }
        if (!File.Exists(outputPath))
        {
            const string message = "Transform completed without producing output.";
            return new TransformResult(false, null, message, diagnostics);
        }
        return new TransformResult(true, File.ReadAllText(outputPath), null, diagnostics);
    }

    private static string JoinDiagnostics(string output, string error)
    {
        return string.Join(
            Environment.NewLine,
            new[] { output.Trim(), error.Trim() }.Where(value => value.Length > 0));
    }

    private static string? FindFrameworkTransformHost()
    {
        string fileName = "BizTalk.DataMapper.FrameworkTransform.exe";
        string packaged = Path.Combine(
            AppContext.BaseDirectory,
            "framework-transform",
            fileName);
        if (File.Exists(packaged))
        {
            return packaged;
        }

        var developmentHosts = new List<string>();
        for (DirectoryInfo? directory = new(AppContext.BaseDirectory);
             directory is not null;
             directory = directory.Parent)
        {
            foreach (string configuration in new[] { "Debug", "Release" })
            {
                string development = Path.Combine(
                    directory.FullName,
                    "BizTalk.DataMapper.FrameworkTransform",
                    "bin",
                    configuration,
                    "net472",
                    fileName);
                if (File.Exists(development))
                {
                    developmentHosts.Add(development);
                }
            }
        }
        if (developmentHosts.Count > 0)
        {
            return developmentHosts
                .OrderByDescending(File.GetLastWriteTimeUtc)
                .First();
        }

        string runtime = Path.Combine(
            Environment.CurrentDirectory,
            "tools",
            "compiler-worker",
            "runtime",
            "win-x64",
            "framework-transform",
            fileName);
        return File.Exists(runtime) ? runtime : null;
    }
}
