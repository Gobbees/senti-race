# Senti Race

**Senti Race allows you to test the Sentiment Analysis computation on the top Cloud Providers to see which one you should use.**

For now, the supported providers are:

- Amazon Comprehend
- Microsoft Azure Text Analytics
- Google Cloud Naturale Language
- IBM Watson Natural Language Understanding

## Getting Started

1. Clone the repo

```sh
git clone git@github.com:Gobbees/senti-race.git
```

2. (If not already installed) [Install Yarn](https://classic.yarnpkg.com/en/docs/install/)
3. Run

```sh
yarn install
```

4. **IMPORTANT** Fill the `.env` file (and Gcloud credentials if you want to use GCP). <br /> See `.env.sample` for instrutions.

5. Fill your `input.json` file <br> **IMPORTANT**: it must contain a valid language code (`en`, `it`, `de`) as `"language"`and a list of input strings as `"sentences"`.

6. (Optional) If you prefer to use `node` instead of `ts-node`, run

```sh
yarn build
```

7. Run the tool using

```sh
yarn start
```

or (if `ts-node`)

```sh
yarn start:ts-node
```
