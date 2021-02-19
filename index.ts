import Comprehend from "aws-sdk/clients/comprehend";
import {
  TextAnalyticsClient,
  AzureKeyCredential,
  AnalyzeSentimentResultArray,
  AnalyzeSentimentSuccessResult,
} from "@azure/ai-text-analytics";
import language from "@google-cloud/language";
import NaturalLanguageUnderstandingV1 from "ibm-watson/natural-language-understanding/v1";
import { IamAuthenticator } from "ibm-watson/auth";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import Handlebars from "handlebars";

require("dotenv").config();

interface Data {
  language: string;
  sentences: string[];
}

const data = require("./input.json") as Data;

const main = async () => {
  if (!data.language) {
    console.error(
      `Language not defined. Please add the language code in "input.json"`
    );
    return;
  }
  if (!data.sentences || !data.sentences.length) {
    console.error(
      `Invalid sentences array. Please provide a correct array of sentences in "input.json"`
    );
    return;
  }
  let awsResult: any = {};
  let azureResult: any = {};
  let gcpResult: any = {};
  let ibmResult: any = {};

  // Amazon Comprehend
  console.log(chalk.keyword("orange")("Amazon Comprehend"));
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log(
      "Skipping Amazon Comprehend since some of the parameters are missing."
    );
    console.log("Please check your .env file if this was not intentional.");
  } else {
    const comprehend = new Comprehend({
      region: process.env.AWS_REGION || "us-east-1",
    });
    const awsRequest = comprehend.batchDetectSentiment({
      LanguageCode: data.language,
      TextList: data.sentences,
    });
    const spinner = ora("Computing sentiment").start();
    const awsResponse = await awsRequest.promise();
    if (awsResponse.ErrorList && awsResponse.ErrorList.length) {
      spinner.fail();
      console.log(chalk.red("Error encountered:"));
      console.log(awsResponse.ErrorList);
    }
    if (awsResponse.ResultList) {
      spinner.succeed();
      console.log(chalk.green("Retrieved data:"));
      awsResult = awsResponse.ResultList;
      console.log(JSON.stringify(awsResult, null, 2));
    }
  }

  // Azure Text Analytics
  console.log(chalk.rgb(51, 153, 255)("Azure Text Analytics"));
  if (!process.env.AZURE_ENDPOINT || !process.env.AZURE_KEY) {
    console.log(
      "Skipping Azure Text Analytics since some of the parameters are missing."
    );
    console.log("Please check your .env file if this was not intentional.");
  } else {
    const azureEndpoint = process.env.AZURE_ENDPOINT;
    const azureKey = process.env.AZURE_KEY;
    const azureClient = new TextAnalyticsClient(
      azureEndpoint,
      new AzureKeyCredential(azureKey)
    );
    const spinner = ora("Computing sentiment").start();
    try {
      const sentimentResult = await azureClient.analyzeSentiment(
        data.sentences,
        data.language
      );
      spinner.succeed("Succeeded");
      azureResult = sentimentResult;
      console.log(JSON.stringify(azureResult, null, 2));
    } catch (error) {
      spinner.fail("Error encountered");
      console.log(error.message);
      return;
    }
  }

  // Google Cloud Natural Language
  console.log(chalk.red("Google Cloud Natural Language"));
  if (!fs.existsSync("./gcloud-credentials.json")) {
    console.log(
      "Skipping Google Cloud Natural Language since some of the parameters are missing."
    );
    console.log(
      "Please check how to authenticate Google Cloud in gcloud-credentials.sample if this was not intentional."
    );
  } else {
    const gcpClient = new language.LanguageServiceClient();
    const spinner = ora("Computing sentiment").start();
    const gcpResponseArray: any[] = [];
    for (const sentence of data.sentences) {
      try {
        const [result] = await gcpClient.analyzeSentiment({
          document: {
            type: "PLAIN_TEXT",
            content: sentence,
            language: data.language,
          },
        });
        gcpResponseArray.push(result);
      } catch (error) {
        spinner.fail("Error encountered");
        console.log(error.message);
        return;
      }
    }
    spinner.succeed("Succeeded");
    gcpResult = gcpResponseArray;
    console.log(JSON.stringify(gcpResult, null, 2));
  }

  // IBM Watson NLU
  console.log(chalk.bgWhite.black("IBM Watson NLU"));
  if (!process.env.IBM_WATSON_API_KEY || !process.env.IBM_WATSON_URL) {
    console.log(
      "Skipping IBM Watson NLU since some of the parameters are missing."
    );
    console.log("Please check your .env file if this was not intentional.");
  } else {
    const ibmClient = new NaturalLanguageUnderstandingV1({
      version: "2020-08-01",
      authenticator: new IamAuthenticator({
        apikey: process.env.IBM_WATSON_API_KEY,
      }),
      serviceUrl: process.env.IBM_WATSON_URL,
    });
    const ibmResponseArray: any[] = [];
    const spinner = ora("Computing sentiment").start();
    for (const sentence of data.sentences) {
      try {
        const sentenceResult = await ibmClient.analyze({
          language: data.language,
          text: sentence,
          features: {
            sentiment: { document: true },
          },
        });
        ibmResponseArray.push(sentenceResult.result);
      } catch (error) {
        spinner.fail("Error encountered");
        console.log(error.message);
        return;
      }
    }
    spinner.succeed("Succeeded");
    ibmResult = ibmResponseArray;
    console.log(JSON.stringify(ibmResult, null, 2));
  }

  // Write file
  const template = Handlebars.compile(
    fs.readFileSync("./template.hbs").toString()
  );
  if (fs.existsSync("./result.html")) {
    fs.unlinkSync("./result.html");
  }
  if (fs.existsSync("./result.json")) {
    fs.unlinkSync("./result.json");
  }
  const spinner = ora("Saving results").start();
  fs.writeFileSync(
    "./result.json",
    JSON.stringify(
      {
        aws: awsResult,
        azure: azureResult,
        gcp: gcpResult,
        ibm: ibmResult,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    "./result.html",
    template({
      result: data.sentences.map((sentence, index) => ({
        sentence,
        awsScore: awsResult[index].Sentiment,
        azureScore: azureResult[index].sentiment,
        ibmScore: ibmResult[index].sentiment.document.label,
        gcpScore: gcpResult[index].documentSentiment.score,
      })),
    })
  );
  spinner.succeed("Done");
};

main();
