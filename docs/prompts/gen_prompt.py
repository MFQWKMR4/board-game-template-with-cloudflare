import pyperclip
import sys


def main():

    wanted = ""
    with open('NL.txt', 'r') as file:
        wanted = file.read()

    input_str = ""
    for l in sys.stdin:
        input_str += l
    replaced_str = input_str.replace("XXXXXXXXXXXXXXX", wanted)
    pyperclip.copy(replaced_str)
    print(replaced_str)

if __name__ == '__main__':
    main()

