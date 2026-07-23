import errorMap from './errorMap.js';
 //BR001
export const getErrorMessage = (errCode) => {
    return errorMap[errCode] || {
        statusHttp: 400,
        message: 'Unknown error',
    };
}