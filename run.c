#include <stdio.h>
#include <stdlib.h>
#include <windows.h>
 
void HideWindow() {
	HWND hwnd = GetForegroundWindow();
	if (hwnd) {
		ShowWindow(hwnd, SW_HIDE);
	}
}

int main(){
	HideWindow();
	system("npm test");
	return 0;
}
