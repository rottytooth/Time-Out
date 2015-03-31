
var forever = 'forever';

function TimeOut() {

    var that = this;

    this.handleList = new Array(); // store of all the handles, in order to clear them

    // internal class Token
    function Token(t, v) {
        this.type = t; // what type is it? there are only two: all expressions are literal values, everything else is a command
        this.value = v; // if it's a literal, the actual value
    }

    Token.TokenType = {
        LITERAL: 0,
        COMMAND: 1
    };

    // actually instantiated Token to be populated when start and end times are established
    function SleepNode(index, to) { // to = the TimeOut object
        var that = this;

        this.toWait = to.programTimes[index];

        this.calledTime = Date.now();
        this.token;
        this.index = index;
        this.executed = false; // the second time we get to the while or if statement, we'll need to know we've been here before

        this.CallBack = function () {
            var executedTime = Date.now();
            var passedTime = executedTime - that.calledTime;
            to.currentTime += Math.round(passedTime / TimeOut.COMMAND_LENGTH);
            that.token = to.commandList[to.currentTime % to.commandList.length];
            to.Execute(that.token, that.toWait, passedTime, to.currentTime, that.executed);
            this.executed = true;

            clearTimeout(that.Handle);

            // if this is an if or while, we'll need to add to call stack and change up the handles

            if (index + 1 < to.programTimes.length)
                nextNode = new SleepNode(index + 1, to);
        }

        this.Handle = window.setTimeout(function () {
            that.CallBack();
        }, this.toWait);

        to.handleList.push(this.Handle);
    }

    this.programTimes = new Array(); // list of all the loaded times, to be executed

    this.callStack = new Array(); // for loops, if statements, etc

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

    concat(Token.TokenType.LITERAL, "NEWLINE");

    // operators
    concat(Token.TokenType.COMMAND, '+'); // ADDS first two items
    concat(Token.TokenType.COMMAND, '-'); // SUBTRACTS second item from first
    concat(Token.TokenType.COMMAND, '*');
    concat(Token.TokenType.COMMAND, '/'); // DIVIDES second item from first
    concat(Token.TokenType.COMMAND, '%');

    // stack operations (an be run on either stack)
    concat(Token.TokenType.COMMAND, "CONCAT"); // concat second into first

    concat(Token.TokenType.COMMAND, "SWAP"); // swap top 2
    concat(Token.TokenType.COMMAND, "DUP"); // copy TOS into NOS
    concat(Token.TokenType.COMMAND, "DROP"); // remove TOS
    concat(Token.TokenType.COMMAND, "ROT3"); // rotate top 3

    concat(Token.TokenType.COMMAND, "PICK"); // get top item (should be a number), copy that numbered item to the top
    concat(Token.TokenType.COMMAND, "ROLL"); // get top item (should be a number), roll that numbered item to top

    concat(Token.TokenType.COMMAND, "DEPTH"); // push the current length of the stack

    concat(Token.TokenType.COMMAND, "EMIT"); // print top item, pops it off the stack
    concat(Token.TokenType.COMMAND, "READ"); // read input, push onto stack

    concat(Token.TokenType.COMMAND, "IF_NONZERO"); // IF top item on data stack is non-zero
    concat(Token.TokenType.COMMAND, "IF_LESSER"); // IF top item on data stack is less than second item
    concat(Token.TokenType.COMMAND, "ENDIF");
    concat(Token.TokenType.COMMAND, "ELSE");

    concat(Token.TokenType.COMMAND, "WHILE_NONZERO"); // WHILE top item on data stack is non-zero
    concat(Token.TokenType.COMMAND, "WHILE_LESSER"); // WHILE top item on data stack is less than second item
    concat(Token.TokenType.COMMAND, "WHILE_GREATER"); // WHILE top item on data stack is more than second item
    concat(Token.TokenType.COMMAND, "ENDWHILE");

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

    that.programList = new Array();

    that.currentQuery = '';

    that.newlines = function (line) {
        line = line.toString(); // in case it's a number
        return line.replace("\n", "<BR>");
    };

    this.Execute = function (token, toWait, passedTime, timeIndex) {
        var console = document.getElementById('console');
//        var output = document.getElementById('output');

        var failed = (passedTime - toWait >= TimeOut.COMMAND_LENGTH / 2.0);

        //build string for program monitor
        var addString = "";
        if (failed) addString += "<span class=\"bad\">";

        if (Object.getOwnPropertyNames(Token.TokenType)[token.type] == 'LITERAL') {
            addString += Object.getOwnPropertyNames(Token.TokenType)[token.type] + " | " + token.value;
        }
        else {
            addString += token.value
        }
        addString +=  "| toWait: " + toWait + "| passedtime: " + passedTime + "<br/>";
        if (failed) addString += "</span>";

        console.innerHTML = addString + console.innerHTML;

        that.currentQuery += TimeOut.Interpret(token) + '\n';

        if (that.callStack.length == 0) { // if the callStack has nothing in it, we can execute what we have. Otherwise, we build up the query
            eval(that.currentQuery);
            that.currentQuery = '';

            // populate our stack
            $('#dataStack').html('');
            for (var di = that.dataStack.length - 1; di >= 0; di--) {
                $('#dataStack').append(that.dataStack[di] + "<br />")
            }
        }
    }

    // this translates pseudo-commands (such as "DUP") into Time Out commands in the timeOut.Set() format
    // used on the translate page
    this.translate = function(program)
    {
        var commandIdx = 0; // index of current command from the big list
        for (var programIdx = 0; programIdx < program.length; programIdx++) {
            var commandDiff = 0; // number of steps from last command to current command
            var startingPlace = commandIdx;

            var sourceValue, sourceType
            var nextTimeFail = false;
            do {
                commandIdx++; commandDiff++;
                if (program.length < programIdx && program[programIdx].trim() === "")  // break on blank lines
                {
                    programIdx++; // advance to the next line
                    continue;
                }

                var sourceParts = (program[programIdx]).split('|');

                sourceType = Object.getOwnPropertyNames(Token.TokenType).indexOf(sourceParts[0]);
                sourceValue = sourceParts[1];

                if (sourceValue != " " && !isNaN(sourceValue))
                {
                    sourceValue = parseInt(sourceValue);
                }

                if (sourceType === -1)
                {
                    $('#console').text("COULD NOT FIND TYPE: " + sourceParts[0]);
                    return;
                }

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
                    return;
                }
            } while (
                sourceType != that.commandList[commandIdx].type ||
                sourceValue !== that.commandList[commandIdx].value
            );

            $('#generatedCode').append("timeOut.Set(" + commandDiff + ");<br />");
        }
        $('#generatedCode').append("timeOut.Set(forever);");
    }

    // token = a Token object
    TimeOut.Interpret = function (token)
    {
        switch(token.type)
        {
            case (Token.TokenType.LITERAL):
                if (token.value == "NEWLINE")
                    return "that.dataStack.push('<br>');";

                if (token.value == " ")
                    return "that.dataStack.push('&nbsp;');";

                var toAdd = '';
                if (isNaN(token.value))
                {
                    toAdd = "'" + token.value + "'";
                }
                else
                {
                    toAdd = token.value;
                }
                return "that.dataStack.push(" + toAdd + ");"; // add to the stack
                break;
            case (Token.TokenType.COMMAND):
                that.programList.push(token.value); // show the command in the program list

                switch (token.value) {
                    case ("EMIT"):
                        return "$('#output').append(that.newlines(that.dataStack.pop()));";

                    case ("CONCAT"):
                    case ("SWAP"):
                    case ("DUP"):
                    case ("ROT3"):
                    case ("PICK"):
                    case ("ROLL"):
                        return "that." + token.value + "();";

                    case ("DROP"):
                        that.dataStack.pop();

                    case ("DEPTH"):
                        that.dataStack.push(that.dataStack.length);

                    case ("-"):
                    case ("*"):
                    case ("/"):
                    case ("%"):
                        return "that.Math('" + token.value + "');"


                    case ("IF_NONZERO"):
                        that.callStack.push(token.value);
                        return "if(that.dataStack[that.dataStack.length - 1] != 0) {";
                    case ("IF_LESSER"):
                        that.callStack.push(token.value);
                        return "if(that.dataStack[that.dataStack.length - 1] < that.dataStack[that.dataStack.length - 2]) {"
                    case ("WHILE_NONZERO"):
                        that.callStack.push(token.value);
                        return "while(that.dataStack[that.dataStack.length - 1] != 0) {"
                    case ("WHILE_LESSER"):
                        that.callStack.push(token.value);
                        return "while(that.dataStack[that.dataStack.length - 1] < that.dataStack[that.dataStack.length - 2]) {"
                    case ("WHILE_GREATER"):
                        that.callStack.push(token.value);
                        return "while(that.dataStack[that.dataStack.length - 1] > that.dataStack[that.dataStack.length - 2]) {"
                    case ("ENDWHILE"):
                        var topOfStack = that.callStack.pop();
                        if (topOfStack == "WHILE_NONZERO" || topOfStack == "WHILE_LESSER" || topOfStack == "WHILE_GREATER")
                        {
                            return "}";
                        }
                        else 
                        {
                            $('#console').append("ENDWHILE UNEXPECTED");
                            return;
                        }
                    case ("ELSE"):
                        var topOfStack = that.callStack[that.callStack.length - 1];
                        if (topOfStack == "IF_NONZERO" || topOfStack == "IF_LESSER") {
                            return "} else {";
                        }
                        else {
                            $('#console').append("ELSE UNEXPECTED");
                            return;
                        }
                    case ("ENDIF"):
                        var topOfStack = that.callStack.pop();
                        if (topOfStack == "IF_NONZERO" || topOfStack == "IF_LESSER") {
                            return "}";
                        }
                        else {
                            $('#console').append("ENDIF UNEXPECTED");
                            return;
                        }
                }
                break;
        }
    }

    // COMMANDS
    // these are the commands called by the code passed back from Interpret()
    that.CONCAT = function()
    {
        var topItem = that.dataStack.pop().toString();
        var secondItem = that.dataStack.pop().toString();
        topItem += secondItem;
        that.dataStack.push(topItem);
    }
    that.SWAP = function()
    {
        var top = that.dataStack.pop();
        var sec = that.dataStack.pop();
        that.dataStack.push(top);
        that.dataStack.push(sec);
    }
    that.DUP = function()
    {
        var top = that.dataStack.pop();
        var next = top;
        that.dataStack.push(top);
        that.dataStack.push(next);
    }

    that.ROT3 = function ()
    {
        var tos = that.dataStack.pop();
        var nos = that.dataStack.pop();
        var thr = that.dataStack.pop();
        that.dataStack.push(thr);
        that.dataStack.push(tos);
        that.dataStack.push(nos);
    }

    that.ROLL = function () {
        var idx = that.dataStack.pop();
        var value = that.dataStack[that.dataStack.length - 1 - idx];
        that.dataStack.splice(that.dataStack.length - 1 - idx, 1);
        that.dataStack.push(value);
    }

    that.PICK = function () {
        var idx = that.dataStack.pop();
        var value = that.dataStack[that.dataStack.length - 1 - idx];
        that.dataStack.push(value);
    }


    that.Math = function(operation)
    {
        var tos = that.dataStack.pop();
        var nos = that.dataStack.pop();
        switch(operation)
        {
            case "+":
                that.dataStack.push(tos + nos);
                break;
            case "-":
                that.dataStack.push(tos - nos);
                break;
            case "*":
                that.dataStack.push(tos * nos);
                break;
            case "/":
                that.dataStack.push(tos / nos);
                break;
            case "^":
                that.dataStack.push(tos ^ nos);
                break;
        }
    }
};




TimeOut.COMMAND_LENGTH = 30.0; // number of milliseconds for it to pass from one command to the next

TimeOut.COMMAND_COUNT = 200; // 3000
