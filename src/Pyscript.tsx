const Pyscript = () => {
  return (
    <div>
      <div
        dangerouslySetInnerHTML={{
          __html: `
              <py-config type="json">
                {
                  "packages": [
                    "https://files.pythonhosted.org/packages/d1/ea/d0db902fd4d930d48c369c4dd2d543d5522e579b5839af89b05ffe340da0/tiledb-0.19.0-cp311-cp311-macosx_10_15_x86_64.whl",
                    "https://files.pythonhosted.org/packages/74/12/62b95655466b26fe20661cd5b6a5ee37b2c89c6b9a11725a7f0200c068d1/cell_census-0.0.1-py3-none-any.whl"
                  ]
                }              
              </py-config>
            `,
        }}
      />
      <div
        dangerouslySetInnerHTML={{
          __html: `
              <py-script>
                from datetime import datetime
                now = datetime.now()
                now.strftime("%m/%d/%Y, %H:%M:%S")
                print("Hello, World! We're running python on the client side!")
              </py-script>`,
        }}
      />
    </div>
  );
};

export default Pyscript;
