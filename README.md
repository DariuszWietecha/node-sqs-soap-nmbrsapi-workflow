copy example.env to dist

npm run pretest

aws --endpoint-url=http://192.168.99.100:4576 sqs create-queue --queue-name sqs

{"source_app":"nmbrs","user":"michiel.crommelinck@officient.io","pass":"2ed523df992646bf9bcfef66f75ef758","group":"1234","controller":"importDaysoff"}

aws --endpoint-url=http://192.168.99.100:4576  sqs send-message --queue-url http://localhost:4576/queue/sqs  --message-body '{"source_app":"nmbrs","user":"michiel.crommelinck@officient.io","pass":"2ed523df992646bf9bcfef66f75ef758", "group":"1234","controller":"importDaysoff"}'

aws --endpoint-url=http://192.168.99.100:4576  sqs purge-queue --queue-url http://localhost:4576/queue/sqs

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="https://api.nmbrs.nl/soap/v2.1/CompanyService">
   <soapenv:Header>
      <com:AuthHeader>
         <!--Optional:-->
         <com:Username>michiel.crommelinck@officient.io</com:Username>
         <!--Optional:-->
         <com:Token>2ed523df992646bf9bcfef66f75ef758</com:Token>
      </com:AuthHeader>
   </soapenv:Header>
   <soapenv:Body>
      <com:List_GetAll/>
   </soapenv:Body>
</soapenv:Envelope>

<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:tns="https://api.nmbrs.nl/soap/v2.1/CompanyService" xmlns:s1="http://microsoft.com/wsdl/types/" xmlns:tm="http://microsoft.com/wsdl/mime/textMatching/"><soap:Header><com:AuthHeader><com:Token>2ed523df992646bf9bcfef66f75ef758</com:Token><com:Username>michiel.crommelinck@officient.io</com:Username></com:AuthHeader></soap:Header><soap:Body><List_GetAll xmlns="https://api.nmbrs.nl/soap/v2.1/CompanyService"></List_GetAll></soap:Body></soap:Envelope>