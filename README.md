# Sequential CI

Sequential CI is a web server that allows users to update CI configuration files in JSON format to execute various commands for API testing, Postgres querying, MongoDB operations, etc. Each process represents a session, enabling data retrieval to run other tests. Below is a sample configuration file used to execute tests:

## Sample Configuration

```json
{
  "status": "active",
  "name": "Vietguys-Generate and identified card",
  "process": [
    {
      "type": "generate-data",
      "description": "Generate data for generate unidentified card",
      // Parameters for generating unidentified cards
    },
    {
      "type": "api",
      "description": "Send API generate card",
      // Command to send the API generate card
    },
    // Other process steps
  ]
}

## Usage Instructions

### Running Tests
To execute specific processes/tests, use the Telegram bot provided within this repository. Employ the following commands:

- `/run:Vietguys-Generate and identified card`: Executes the specified process.
- `/list`: Lists available processes.
- `/runall`: Runs all processes.
- `/help`: Displays available commands and their usage.

### Understanding the Configuration
- `status`: Indicates the configuration's status.
- `name`: Name of the configuration process.
- `process`: Array containing individual steps of the testing process.
- Each step includes:
  - `type`: Process type (e.g., generate-data, api, delay, postgres, validateJson, mongo, etc.).
  - `description`: Description of the step.
  - Additional parameters or commands specific to each step.

Feel free to modify the JSON configuration to suit your testing needs by updating the process array with the necessary steps and their details.

