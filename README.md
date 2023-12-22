# Sequential CI 🤖 🚀

Sequential CI is a web server that allows users to update CI configuration files in JSON format to execute various commands for API testing, Postgres querying, MongoDB operations, etc. Each process represents a session, enabling data retrieval to run other tests. Below is a sample configuration file used to execute tests:

## Sample Configuration

```json
{
  "status": "active",
  "name": "name-of-process",
  "process": [
    {
      "type": "generate-data",
      "description": "Generate data ",
      // Parameters for generating data
    },
    {
      "type": "api",
      "description": "Send API",
      // Command to send the API
    },
    // Other process steps
  ]
}
```

## Usage Instructions

### Running Tests
To execute specific processes/tests, use the Telegram bot provided within this repository. Employ the following commands:

- 🏃‍♂️ `/run:name-of-process`: Executes the specified process.
- 📋 `/list`: Lists available processes.
- ⏩ `/runall`: Runs all processes.
- ℹ️ `/help`: Displays available commands and their usage.

### Understanding the Configuration
- ℹ️ `status`: Indicates the configuration's status.
- ℹ️ `name`: Name of the configuration process.
- ℹ️ `process`: Array containing individual steps of the testing process.
- Each step includes:
  - ℹ️ `type`: Process type (e.g., generate-data, api, delay, postgres, validateJson, mongo, etc.).
  - ℹ️ `description`: Description of the step.
  - Additional parameters or commands specific to each step.

Feel free to modify the JSON configuration to suit your testing needs by updating the process array with the necessary steps and their details.
