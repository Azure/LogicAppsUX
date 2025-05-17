using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net;
using System.Threading.Tasks;
using System.Net.Http;

namespace LogicApps.Codeful.Helloworkflow
{
    public static class WorkflowOrchestrator
    {
        [FunctionName("HelloOrchestrator")]
        public static async Task<string> RunOrchestrator(
            [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {

            var triggerInput = context.GetInput<HTTPHelloInput>();
            log.LogInformation("Starting orchestrator with input: {triggerInput}", JsonSerializer.Serialize(triggerInput));

            var msgResponse = "Hello from orchestrator";

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
                Greeting = "Hello from Codeful " + requestContent
            };

            log.LogInformation("Workflow Input = '{workflowInput}'.", JsonSerializer.Serialize(workflowInput));

            string instanceId = await starter.StartNewAsync("HelloOrchestrator", workflowInput);

            log.LogInformation("Started orchestration with ID = '{instanceId}'.", instanceId);

            DurableOrchestrationStatus status;
            do
            {
                status = await starter.GetStatusAsync(instanceId);
                await Task.Delay(1000); // Wait for 1 second before checking the status again
            } while (status.RuntimeStatus == OrchestrationRuntimeStatus.Running || 
                    status.RuntimeStatus == OrchestrationRuntimeStatus.Pending);

            if (status.RuntimeStatus == OrchestrationRuntimeStatus.Completed)
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(status.Output.ToString(), System.Text.Encoding.UTF8, "application/json")
                };
            }

            return new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent("Orchestration did not complete successfully.")
            };
        }
    }

    public class HTTPHelloInput
    {
        public string Greeting { get; set; }

    }

}
 