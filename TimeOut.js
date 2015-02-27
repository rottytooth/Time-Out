
var forever = 'forever';

function TimeOut() {

    var that = this;

    // internal class Token
    // holds a TokenType and corresponding value for 
    function Token(t, v, tt) {
        this.type = t;
        this.value = v;
        this.target = tt
    }

    function Token(t, v) {
        this.type = t;
        this.value = v;
        this.target = null;
    }

    Token.TokenType = {
        LITERAL: 0,
        OPERATOR: 1,
        COMMAND: 2,
        IMMEDIATE: 3,
        PLACEHOLDER: 4,
        EXPRESSION: 5
    };

    Token.Target = {
        DATA: 0,
        COMMAND: 1
    }

    // actually instantiated Token to be populated when start and end times are established
    function SleepNode(index, to) {
        var that = this;

        this.toWait = to.programTimes[index];

        this.calledTime = Date.now();
        this.token;
        this.Index = index;

        this.CallBack = function () {
            var executedTime = Date.now();
            var passedTime = executedTime - that.calledTime;
            to.currentTime += Math.round(passedTime / TimeOut.COMMAND_LENGTH);
            that.token = to.commandList[to.currentTime % to.commandList.length];
            to.Execute(that.token, that.toWait, passedTime, to.currentTime);
            clearTimeout(that.Handle);

            if (index + 1 < to.programTimes.length)
                nextNode = new SleepNode(index + 1, to);
        }

        this.Handle = window.setTimeout(function () {
            that.CallBack();
        }, this.toWait);
    }

    this.programTimes = new Array(); // list of all the loaded times, to be executed

    this.programTokenList; // linked list of sleepnodes

    this.commandList = new Array();
    this.currentCommandIndex = 0;
    this.currentTime = 0;

    var concat = function(type, value) {
        that.commandList.push(new Token(type, value));
    }

    for (var a = 0; a < 16; a++) {
        concat(Token.TokenType.LITERAL, a);
    } // literals

    var chars =
        "abcdefghijklmnopqrstuvwxyz" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        " _<>,.?/:;\"'{}[]|`~!@#$%^&*()-+=\\'"; // 34

    for (var a = 0; a < chars.length; a++) {

        concat(Token.TokenType.LITERAL, chars[a]);
    } // literals

    // operators
    concat(Token.TokenType.OPERATOR, '+');
    concat(Token.TokenType.OPERATOR, '-');
    concat(Token.TokenType.OPERATOR, '*');
    concat(Token.TokenType.OPERATOR, '/');
    concat(Token.TokenType.OPERATOR, '^');

    // stack operations (an be run on either stack)
    concat(Token.TokenType.COMMAND, "CONCAT", Token.Target.DATA); // concat second into first

    concat(Token.TokenType.COMMAND, "SWAP", Token.Target.COMMAND); // swap top 2
    concat(Token.TokenType.COMMAND, "SWAP", Token.Target.DATA); // swap top 2
    concat(Token.TokenType.COMMAND, "DUP", Token.Target.COMMAND); // copy TOP into NOP
    concat(Token.TokenType.COMMAND, "DUP", Token.Target.DATA); // copy TOP into NOP
    concat(Token.TokenType.COMMAND, "ROT3", Token.Target.COMMAND); // rotate top 3
    concat(Token.TokenType.COMMAND, "ROT3", Token.Target.DATA); // rotate top 3

    concat(Token.TokenType.COMMAND, "PRINT"); // .
    concat(Token.TokenType.IMMEDIATE, "EXECUTE");

    concat(Token.TokenType.COMMAND, "ROTALL", Token.Target.COMMAND); // rotate entire stack
    concat(Token.TokenType.COMMAND, "ROTALL", Token.Target.DATA); // rotate entire stack

    concat(Token.TokenType.COMMAND, "IF"); // IF top item on data stack is non-zero
    concat(Token.TokenType.COMMAND, "ENDIF");
    concat(Token.TokenType.COMMAND, "ELSE");

    concat(Token.TokenType.EXPRESSION, "STACK1"); // points to top datastack item
    concat(Token.TokenType.EXPRESSION, "STACK2"); // points to 2nd top datastack item
    concat(Token.TokenType.EXPRESSION, "STACK3"); // points to 3rd top datastack item
    concat(Token.TokenType.EXPRESSION, "STACK4"); // points to 4th top datastack item

    concat(Token.TokenType.OPERATOR, '==');
    concat(Token.TokenType.OPERATOR, '>');
    concat(Token.TokenType.OPERATOR, '<');

    while (this.commandList.length < TimeOut.COMMAND_COUNT)
    {
        concat(Token.TokenType.PLACEHOLDER, "UNASSIGNED");
    }


    this.Set = function (time) {
        if (time == forever) {
            that.sleepNodeList = new SleepNode(0, that);
        }
        else if (!isNaN(time)) {
            // amount to sleep
            that.programTimes.push(parseInt(time) * TimeOut.COMMAND_LENGTH);
        }
        else {
            // FIXME: this should be written to output
            alert("invalid time entered: " + time);
        }
    };

    that.dataStack = new Array();

    that.commandStack = new Array();

    this.Execute = function (token, toWait, passedTime, timeIndex) {
        var console = document.getElementById('console');
        var output = document.getElementById('output');

        var failed = (passedTime - toWait >= TimeOut.COMMAND_LENGTH / 2.0);

        var addString = "";

        if (failed) addString += "<span class=\"bad\">";

        addString += "<br/>tokenType: " + Object.getOwnPropertyNames(Token.TokenType)[token.type] + ", tokenValue: " + token.value +
            ", toWait: " + toWait + ", passedtime: " + passedTime

        if (failed) addString += "</span>";

        console.innerHTML += addString;

        var response = TimeOut.Interpret(token);

        if (response == ' ') response = '&nbsp;';

        if (response != undefined)
            output.innerHTML += response;
    }

    this.translate = function(program)
    {
        var commandIdx = 0; // index of current command from the big list
        for (var programIdx = 0; programIdx < program.length; programIdx++) {
            var commandDiff = 0; // number of steps from last command to current command
            var startingPlace = commandIdx;

            var sourceValue, sourceType, sourceTarget;
            var nextTimeFail = false;
            do {
                var sourceParts = (program[programIdx]).split('|');

                sourceType = Object.getOwnPropertyNames(Token.TokenType).indexOf(sourceParts[0]);
                sourceValue = sourceParts[1];
                sourceTarget = undefined;

                if (sourceParts.length == 3)
                {
                    sourceTarget = Object.getOwnPropertyNames(Token.Target).indexOf(sourceParts[2]);
                }

                if (sourceType == -1)
                {
                    $('#console').text("COULD NOT FIND TYPE: " + sourceParts[0]);
                }

                commandIdx++; commandDiff++;
                if (nextTimeFail) {
                    $('#console').text("COULD NOT FIND COMMAND: " + sourceValue);
                    return;
                }
                if (commandIdx >= that.commandList.length) // take care of looping
                    commandIdx = 0;
                if (commandIdx == startingPlace) { // if we've looped all the way around
                    nextTimeFail = true;
                }

                if (that.commandList[commandIdx] == undefined)
                {
                    $('#console').text("BAD COMMAND");
                }
            } while (
                sourceType != that.commandList[commandIdx].type ||
                sourceValue !== that.commandList[commandIdx].value &&
                (sourceTarget == undefined || sourceTarget == that.commandList[commandIdx].target)
            );

            $('#generatedCode').append("timeOut.Set(" + commandDiff + ");<br />");
        }
        $('#generatedCode').append("timeOut.Set(forever);");
    }

    TimeOut.Interpret = function (token)
    {
        var retVal;

        switch(token.type)
        {
            case (Token.TokenType.LITERAL):
                that.dataStack.push(token.value);
                break;
            case (Token.TokenType.COMMAND):
                that.commandStack.push(token.value);
                break;
            case (Token.TokenType.IMMEDIATE):
                var command = '';
                if (token.value == "EXECUTE") {
                    var command = that.commandStack.pop();
                }
                if (token.value == "PRINT" || (token.value == "EXECUTE" && command == "PRINT"))
                    retVal = that.dataStack.pop();
                if (token.value == "EXECUTE" && command == "CONCAT") {
                    var topItem = that.dataStack.pop();
                    var secondItem = that.dataStack.pop();
                    topItem += secondItem;
                    that.dataStack.push(topItem);
                }
                if (token.value == "SWAP")
                {
                    var stack = that.determineStack(token);
                    var top = stack.pop();
                    var sec = stack.pop();
                    stack.push(top);
                    stack.push(stack);
                }
                if (token.value == "DUP") {
                    var stack = that.determineStack(token);
                    var top = stack.pop();
                    var copy = jQuery.extend({}, top);
                    stack.push(top);
                    stack.push(copy);
                }
                if (token.value == "ROT3") {
                    var stack = that.determineStack(token);
                    var top = stack.pop();
                    var sec = stack.pop();
                    var thr = stack.pop();
                    stack.push(top);
                    stack.push(thr);
                    stack.push(sec);
                }
                break;
        }
        $('#dataStack').html('DATA STACK<br />');
        for (var di = that.dataStack.length - 1; di >= 0; di--)
        {
            $('#dataStack').append(that.dataStack[di] + "<br />")
        }
        $('#commandStack').html('COMMAND STACK<br />');
        for (var ci = that.commandStack.length - 1; ci >= 0; ci--) {
            $('#commandStack').append(that.commandStack[ci] + "<br />")
        }

        return retVal;
    }

    that.determineStack = function (token) {
        return (token.target == Token.Target.DATA ?
        that.dataStack :
        that.commandStack);
    }
};




TimeOut.COMMAND_LENGTH = 30.0; // number of milliseconds for it to pass from one command to the next

TimeOut.COMMAND_COUNT = 200; // 3000
