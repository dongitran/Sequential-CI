# Sequential CI 🤖 🚀

Sequential CI is a web server that allows users to update CI configuration files in JSON format to execute various commands for API testing, Postgres querying, MongoDB operations, and more. Each process represents a session, enabling data retrieval for subsequent tests. Below is a sample configuration file for test execution:

## Sample Configuration of Process


{
  "status": "active",
  "name": "name-of-process",
  "process": [
    {
      "type": "generate-data",
      "description": "Generate data",
      "parameters": {
        "phoneNumber": "\"09\" + Math.floor(Math.random()*99999999).toString().padStart(8, \"0\")"
      }
    },
    {
      "type": "api",
      "description": "Send API",
      "curl": "curl --location 'http://localhost:3000/get/{parameters['id']}",
      "parameters": {
        "resultApi": null
      }
    },
    {
      "name": "postgres",
      "description": "Get customer",
      "query": "select * from customers where id = '{parameters['id']}'",
      "config": {
        "host": "0.0.0.0",
        "port": "5432",
        "username": "sequentialCi",
        "password": "sequentialCi",
        "db": "demoDb"
      },
      "parameters": {
        "customer": null,
        "customerId": "id"
      }
    },
    // Other process steps
  ]
}


## Usage Instructions

### Command
To execute specific processes/tests, use the Telegram bot provided within this repository. Employ the following commands:🛸

- 🏃‍♂️ `/run:(name or id of process)`: Executes the specified process.
- ⏩ `/runall`: Runs all processes.
- 📋 `/list`: Lists available processes.
- 📦 `/clone:(id of process)`: Clone the process.
- ❌ `/delete:(id of process)`: Delete the process.
- ℹ️ `/help`: Displays available commands and their usage.

## Process Types
- `generate-data`: Generates data via JavaScript code, either by direct assignment or JavaScript-based generation. The generated values are stored for subsequent use during execution.
- `api`: Executes an API call using a cURL string, employing variables within the process. It interacts with the API and stores the result within the ongoing process.
- `postgres`: Executes SQL queries, leveraging variables within the process to retrieve data from a PostgreSQL database and store it within the ongoing process.
- `mongo`: Executes queries within a MongoDB database.
- `validateJson`: Validates a JSON object derived from session variables.
- `delay`: Introduces a time delay in milliseconds during the execution process.


Feel free to modify the JSON configuration to suit your testing needs by updating the process array with the necessary steps and their details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
