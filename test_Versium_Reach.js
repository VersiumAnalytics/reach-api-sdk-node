import Reach from './Versium_REACH.js';

//USE THIS METHOD FOR TESTING, DELETE IT BEFORE PUBLISHING THE REPO
//uncomment/change the code block according to the api you want to use, then run the program
async function testMethod() {
    //c2b test data
    // const testInputData = Array(135).fill({ first: "Angela", last: "Adams", email: "adamsangela@hotmail.com" });
    // const testOutputTypes = [];
    // const testDataTool = 'c2b';

    //iptodomain test data
    // const testInputData = Array(97).fill({ ip: "152.44.212.248" });
    // const testOutputTypes = [];
    // const testDataTool = 'iptodomain';

    //contact append test data
    // const testInputData = Array(101).fill({ email: "adamsangela@hotmail.com" });
    // const testOutputTypes = ["address", "phone"];
    // const testDataTool = 'contact';

    //demographic test data
    // const testInputData = Array(88).fill({ email: "adamsangela@hotmail.com" });
    // const testOutputTypes = ["lifestyle", "political"];
    // const testDataTool = 'demographic';

    //b2cOnlineAudience test data
    // const testInputData = Array(95).fill({ first: "Marc", last: "Blythe", email: "marc@blytheglobal.com" });
    // const testOutputTypes = [];
    // const testDataTool = 'b2cOnlineAudience';

    //b2bOnlineAudience test data
    // const testInputData = Array(95).fill({ first: "Marc", last: "Blythe", email: "marc@blytheglobal.com" });
    // const testOutputTypes = [];
    // const testDataTool = 'b2bOnlineAudience';

    //firmographic test data
    // const testInputData = Array(5).fill({ email: "marc@blytheglobal.com" });
    // const testOutputTypes = [];
    // const testDataTool = 'firmographic';

    //hemtobusinessdomain test data
    // const testInputData = Array(60).fill({ email: "a3bf653e8393decc6cde18e15c4469fc" });
    // const testOutputTypes = [];
    // const testDataTool = 'hemtobusinessdomain';

    const reachUser = new Reach('apiKeyHere', true);
    const responses = await reachUser.append(testDataTool, testInputData, testOutputTypes);
}
testMethod();
