import base64,sys
data = base64.b64decode(sys.argv[1])
open(sys.argv[2],chr(119)+chr(98)).write(data)
