export const DataRegistryAbi = [
  {
    "type":"event","name":"DataPublished","inputs":[
      {"name":"owner","type":"address","indexed":true},
      {"name":"cid","type":"string","indexed":false}
    ]
  },
  {
    "type":"function","name":"publish","stateMutability":"nonpayable",
    "inputs":[{"name":"cid","type":"string"}],"outputs":[]
  }
] as const;
