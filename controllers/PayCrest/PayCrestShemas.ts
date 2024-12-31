import * as yup from 'yup';

export const transactionSchema = yup.object().shape({
  amount: yup.number().required('Amount is required'),
  token: yup.string().required('Token is required'),
  rate: yup.string().required().matches(/^\d+$/, 'Rate must be a positive integer'),
  network: yup.string().required('Network is required'),
  recipient: yup.object().shape({
    bankId: yup.string().required('Bank Id is required'),
    accountNumber: yup.string().required('Account Number is required'),
    accountName: yup.string().required('Account Name is required')
  }),
  returnAddress: yup.string().required('User address is required')
});


export const verifyAccountNameDateSchema = yup.object().shape({
  bankId: yup.string().required('Bank Id is required'),
  accountNumber: yup.string().required('Account number is required'),
})