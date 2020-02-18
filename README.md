# Node SQS SOAP Nmbrs.nl API workflow

## Introduction
Workflow is triggered by SQS messages. During the execution, it retrieves an employee absence data from [api.nmbrs.nl API](https://api.nmbrs.nl) and saves as JSON files with the required structure.

## Implementation details
Main used dependencies:
- [sqs-consumer](sqs-consumer)
- [node-soap](https://github.com/vpulim/node-soap)
- [typescript](https://www.typescriptlang.org/)
- [Mocha](https://mochajs.org/)
- [localstack](https://github.com/localstack/localstack)

### Running the workflow
1. Install dependencies and build using `npm install`.
2. Copy `example.env` as `.env` and update it according to a queue details which will be used to trigger the workflow.
3. Run the workflow using `npm start`.
3. Check logs and an ./output directory.
4. To re-build the workflow use `npm run build`.

## Testing
### Using Local Stack
1. Copy `example.env` as `.env`.
2. [Install Docker Compose](https://docs.docker.com/compose/install/), run the Docker and update `.env/SQS_URL` with <Docker default machine IP>:4576.
3. Run the Local Stack and create a queue by command `npm run startLocalStack`.
4. Uncomment below two lines in `index.ts`:
```
// const messageCommand = "{'source_app' => 'nmbrs', 'user' => 'michiel.crommelinck@officient.io', 'pass' => '2ed523df992646bf9bcfef66f75ef758', 'group' => 1234, 'controller' => 'importDaysoff',}";
// lib.sendMessage(sqs, queueUrl, messageCommand);
```
5. Build the workflow by command `npm build`.
6. Run workflow by command `npm run`.
7. Check logs and an ./output folder.

### Unit tests
1. Run the Mocha by `npm run test`.

## Notes
* .vscode directory was committed to the repository to let to debug the workflow execution and unit tests execution in VSCode.
* Unit test contain assertions strictly testing the correctnes of data generated by the workflow.
* Assertion for `IEmployeData.historical_days_off[item].date` compares parsed Date to solve timezones difference problem.
* Unit tests related to error handling was skipped due to time limits.