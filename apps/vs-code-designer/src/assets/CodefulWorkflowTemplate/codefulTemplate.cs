using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net;
using System.Threading.Tasks;
using System.Net.Http;

namespace LogicApps.Codeful.HelloWorkflow
{
    public static class WorkflowOrchestrator
    {
        [FunctionName("HelloOrchestrator")]
        public static async Task<string> RunOrchestrator(
            [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {

            var triggerInput = context.GetInput<HTTPHelloInput>();
            log.LogInformation("Starting orchestrator with input: {triggerInput}", JsonSerializer.Serialize(triggerInput));

            var msgResponse = triggerInput.Greeting;

            return msgResponse;
        }

        [FunctionName("HelloTrigger")]
        public static async Task<HttpResponseMessage> HttpStart(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestMessage req,
            [DurableClient] IDurableOrchestrationClient starter,
            ILogger log)
        {
            var requestContent = await req.Content.ReadAsStringAsync();

            var workflowInput = new HTTPHelloInput
            {
                Greeting = $"Hello from Codeful workflows. You said '{requestContent}'"
            };

            log.LogInformation("Workflow Input = '{workflowInput}'.", JsonSerializer.Serialize(workflowInput));

            string instanceId = await starter.StartNewAsync("HelloOrchestrator", workflowInput);

            log.LogInformation("Started orchestration with ID = '{instanceId}'.", instanceId);

            return await starter.WaitForCompletionOrCreateCheckStatusResponseAsync(req, instanceId);
        }
    }
    
    public class HTTPHelloInput
    {
        public string Greeting { get; set; }

    }

}
 