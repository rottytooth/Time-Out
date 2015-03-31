# Time-Out
TIME OUT tries to do for the Web what Folders did for Windows. https://github.com/rottytooth/Folders

Every line of code is a time out, telling the interpreter to do nothing for a specific amount of time. One can think of the interpreter as cycling through all the commands during these time outs. Whatever it lands on when the time out has ended, it executes next. In this language, every meaningful action occurs between the lines of code.

Time Out runs in the browser. The speed can be set (by default, it cycles through a command every 30ms). However, when Time Out is not running in the active tab, in most browsers, it tends to run too slow and so "miss" the intended commands, throwing off the entire program. The only reliable way to ensure a Time Out program runs correctly is to set it to your active tab, and sit and wait, watching the commands being processed, one by one. If you bring up another tab, or even another application, it will likely fail.

The speed is set to 30ms/command by default, and can be adjusted according to the speed of the machine and patience of the programmer.
