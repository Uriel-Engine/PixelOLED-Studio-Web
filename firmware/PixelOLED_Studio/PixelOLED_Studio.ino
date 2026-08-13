/*
  PixelOLED Studio — Uriel Engine
  SSD1306 I2C receiver for Arduino Uno, Nano, Mega 2560 and ESP32-S3 Zero.

  Install from Arduino Library Manager:
    - Adafruit GFX Library
    - Adafruit SSD1306

  The app selects the active physical height (32 or 64) over USB/Serial.
*/

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define OLED_WIDTH 128
#define OLED_BUFFER_HEIGHT 64  // Maximum buffer; supports both 128x32 and 128x64 panels.
#define OLED_ADDRESS 0x3C
#define SERIAL_BAUD 115200

#if defined(ESP32)
  #define SDA_PIN 8
  #define SCL_PIN 9
#elif defined(ARDUINO_AVR_MEGA2560)
  #define SDA_PIN 20
  #define SCL_PIN 21
#else
  // Arduino Uno and Arduino Nano classic.
  #define SDA_PIN A4
  #define SCL_PIN A5
#endif

const uint16_t DISPLAY_BUFFER_SIZE = OLED_WIDTH * OLED_BUFFER_HEIGHT / 8;
Adafruit_SSD1306 display(OLED_WIDTH, OLED_BUFFER_HEIGHT, &Wire, -1);
uint8_t activeOledHeight = OLED_BUFFER_HEIGHT;

enum Command : uint8_t {
  SET_PIXEL = 0x01,
  CLEAR_DISPLAY = 0x02,
  INVERT_PIXELS = 0x03,
  FILL_DISPLAY = 0x04,
  SET_FRAME = 0x05,
  ACKNOWLEDGE = 0x06,
  BEGIN_FRAME = 0x07,
  SET_FRAME_ROW = 0x08,
  COMMIT_FRAME = 0x09,
  CONFIGURE_DISPLAY_HEIGHT = 0x0A,
};

enum ReceiverState : uint8_t { WAIT_MAGIC, READ_COMMAND, READ_LENGTH_LOW, READ_LENGTH_HIGH, READ_DATA, READ_CHECKSUM };
ReceiverState receiverState = WAIT_MAGIC;
uint8_t command = 0;
uint16_t expectedLength = 0;
uint16_t receivedLength = 0;
uint8_t checksum = 0;
uint8_t smallPayload[3];
uint8_t rowPayload[17];
uint8_t frameHeight = 0;
uint16_t frameByteIndex = 0;
bool framePayloadIsValid = false;
bool frameTransactionActive = false;

void showDisplay() {
  display.display();
}

bool configureDisplayHeight(uint8_t height) {
  if (height != 32 && height != 64) return false;
  activeOledHeight = height;
  display.ssd1306_command(0xA8);  // SETMULTIPLEX
  display.ssd1306_command(height - 1);
  display.ssd1306_command(0xDA);  // SETCOMPINS
  display.ssd1306_command(height == 64 ? 0x12 : 0x02);
  display.clearDisplay();
  showDisplay();
  return true;
}

void sendAck(uint8_t acknowledgedCommand) {
  const uint8_t responseCommand = ACKNOWLEDGE;
  const uint8_t payloadLength = 1;
  const uint8_t checksumValue = responseCommand ^ payloadLength ^ acknowledgedCommand;
  Serial.write(0xAA);
  Serial.write(responseCommand);
  Serial.write(payloadLength);
  Serial.write(0x00);
  Serial.write(acknowledgedCommand);
  Serial.write(checksumValue);
}

void resetReceiver() {
  receiverState = WAIT_MAGIC;
  expectedLength = 0;
  receivedLength = 0;
  checksum = 0;
  frameHeight = 0;
  frameByteIndex = 0;
  framePayloadIsValid = false;
}

void startFrame(uint8_t height) {
  frameHeight = height;
  frameByteIndex = 0;
  framePayloadIsValid = frameHeight == activeOledHeight && expectedLength == 1 + (uint16_t)frameHeight * 16;
  if (framePayloadIsValid) {
    display.clearDisplay();
  }
}

void writeFrameByte(uint8_t value) {
  if (!framePayloadIsValid || frameByteIndex >= DISPLAY_BUFFER_SIZE) return;
  const uint8_t xBase = (frameByteIndex % 16) * 8;
  const uint8_t y = frameByteIndex / 16;
  const uint16_t bufferBase = (uint16_t)(y / 8) * OLED_WIDTH + xBase;
  const uint8_t yMask = 1 << (y & 7);
  uint8_t* buffer = display.getBuffer();
  for (uint8_t bit = 0; bit < 8; ++bit) {
    if (value & (1 << (7 - bit))) buffer[bufferBase + bit] |= yMask;
    else buffer[bufferBase + bit] &= ~yMask;
  }
  ++frameByteIndex;
}

void writeFrameRow(uint8_t y, const uint8_t* row) {
  const uint16_t bufferBase = (uint16_t)(y / 8) * OLED_WIDTH;
  const uint8_t yMask = 1 << (y & 7);
  uint8_t* buffer = display.getBuffer();
  for (uint8_t byteIndex = 0; byteIndex < 16; ++byteIndex) {
    const uint8_t value = row[byteIndex];
    const uint16_t columnBase = bufferBase + byteIndex * 8;
    for (uint8_t bit = 0; bit < 8; ++bit) {
      if (value & (1 << (7 - bit))) buffer[columnBase + bit] |= yMask;
      else buffer[columnBase + bit] &= ~yMask;
    }
  }
}

bool executeCommand() {
  switch (command) {
    case SET_PIXEL:
      if (expectedLength == 3 && smallPayload[0] < OLED_WIDTH && smallPayload[1] < activeOledHeight) {
        display.drawPixel(smallPayload[0], smallPayload[1], smallPayload[2] ? SSD1306_WHITE : SSD1306_BLACK);
        showDisplay();
        return true;
      }
      break;
    case CLEAR_DISPLAY:
      if (expectedLength == 0) {
        display.clearDisplay();
        showDisplay();
        return true;
      }
      break;
    case INVERT_PIXELS:
      if (expectedLength == 0) {
        for (uint16_t i = 0; i < DISPLAY_BUFFER_SIZE; ++i) display.getBuffer()[i] = ~display.getBuffer()[i];
        showDisplay();
        return true;
      }
      break;
    case FILL_DISPLAY:
      if (expectedLength == 0) {
        for (uint16_t i = 0; i < DISPLAY_BUFFER_SIZE; ++i) display.getBuffer()[i] = 0xFF;
        showDisplay();
        return true;
      }
      break;
    case SET_FRAME:
      if (framePayloadIsValid && frameByteIndex == DISPLAY_BUFFER_SIZE) {
        showDisplay();
        return true;
      }
      break;
    case BEGIN_FRAME:
      if (expectedLength == 1 && smallPayload[0] == activeOledHeight) {
        display.clearDisplay();
        frameTransactionActive = true;
        return true;
      }
      break;
    case SET_FRAME_ROW:
      if (frameTransactionActive && expectedLength == 17 && rowPayload[0] < activeOledHeight) {
        writeFrameRow(rowPayload[0], rowPayload + 1);
        return true;
      }
      break;
    case COMMIT_FRAME:
      if (frameTransactionActive && expectedLength == 0) {
        showDisplay();
        frameTransactionActive = false;
        return true;
      }
      break;
    case CONFIGURE_DISPLAY_HEIGHT:
      if (expectedLength == 1) {
        return configureDisplayHeight(smallPayload[0]);
      }
      break;
  }
  return false;
}

void consumeDataByte(uint8_t value) {
  if (command == SET_FRAME) {
    if (receivedLength == 0) startFrame(value);
    else writeFrameByte(value);
  } else if (command == SET_FRAME_ROW && receivedLength < sizeof(rowPayload)) {
    rowPayload[receivedLength] = value;
  } else if (receivedLength < sizeof(smallPayload)) {
    smallPayload[receivedLength] = value;
  }
}

void readSerial() {
  while (Serial.available()) {
    const uint8_t value = Serial.read();
    switch (receiverState) {
      case WAIT_MAGIC:
        if (value == 0xAA) receiverState = READ_COMMAND;
        break;
      case READ_COMMAND:
        command = value;
        checksum = value;
        receiverState = READ_LENGTH_LOW;
        break;
      case READ_LENGTH_LOW:
        expectedLength = value;
        checksum ^= value;
        receiverState = READ_LENGTH_HIGH;
        break;
      case READ_LENGTH_HIGH:
        expectedLength |= (uint16_t)value << 8;
        checksum ^= value;
        receivedLength = 0;
        receiverState = expectedLength ? READ_DATA : READ_CHECKSUM;
        break;
      case READ_DATA:
        checksum ^= value;
        consumeDataByte(value);
        ++receivedLength;
        if (receivedLength == expectedLength) receiverState = READ_CHECKSUM;
        break;
      case READ_CHECKSUM:
        if (value == checksum && executeCommand()) sendAck(command);
        resetReceiver();
        break;
    }
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD);
#if defined(ESP32)
  Wire.begin(SDA_PIN, SCL_PIN);
#else
  Wire.begin();
#endif
  Wire.setClock(400000UL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    for (;;) delay(100);
  }
  display.clearDisplay();
  showDisplay();
}

void loop() {
  readSerial();
}
