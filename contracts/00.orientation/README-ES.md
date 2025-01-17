## Guía para llamadas entre Contratos (Cross-Contract)

El protocolo NEAR permite la creación de transacciones en el código de un contrato. De esta nanera considera los casos de uso mas comunes, como llamar a un contrato desde otro, pero tambien patrones de uso mas avanzados, como usar un contrato como fábrica (Factory) para generar, o servir como Proxy, a otros contratos. El mecanismo en si tiene muchos nombres que generan confusión al principio, pero luego uno se da cuenta de que todo el mundo está hablando de diferentes partes de un mismo elefante, solo que visto desde perspectivas diferentes. 

### Recibos (Receipts)

Todas las llamadas entre contratos (también conocidas como "xcc") utilizan las mismas estructuras de datos: `ActionReceipts` y `DataReceipts`.

- `ActionReceipts` representan una transacción *planificada, garantizada*, interna a la red NEAR, luego que la firma haya sido verificada. 
- `DataReceipts` representan el resultado de una transacción completada enrutada a algún destino. 

Puede leer más sobre estos conceptos en la [documentación técnica](https://nomicon.io/RuntimeSpec/Receipts.html).

### Niveles de Abstracción

Existen dos (2) niveles de abstracción en el SDK de NEAR para AssemblyScript y Rust. El nivel más alto es el recomendado para los novatos a la plataforma, ya que es más amigable para los desarrolladores. Los archivos incluidos en este módulo proveen ejemplos de cada uno de estos niveles, ofreciendo suficiente contexto (esperamos) que permita entender claramente como usarlos.

- **Alto Nivel**:
  - API de llamadas de funciones simples (Function Call API) \
    Recomendada cuando se necesita realizar una llamada a una función, o varias llamadas a funciones entre contratos. Esta API es bastante similar entre sus versiones de AssemblyScript y Rust, con algunas diferencias menores. 
  - API de Acciones por Lote (Batch Actions API) \ 
    Recomendada cuando se aplica cualquier tipo de [`Action`]() en el código del contrato. 
    Esta API es bastante similar entre sus versiones de AssemblyScript y Rust, con algunas diferencias menores. 

- **Bajo Nivel**: \
  No recomendado para uso general, pero muy interesante para aprender sobre cómo los SDK de NEAR funcionan internamente, ya que revela el API de la máquina virtual de NEAR. 
  Esta API es muy similar entre sus versiones en AssemblyScript y Rust a la hora de programar contratos, ya que es una interfaz directa con la máquina virtual. 

### Archivos en éste Módulo

```
contracts
└── 00.orientation
    ├── README-ES.md                        <-- este archivo
    ├── simulation
    │   ├── Cargo.toml
    │   └── src
    │       ├── lib.rs                      <-- pruebas de simulación
    │       ├── local.rs                    <-- interfaz de contrato 00-local
    │       └── remote.rs                   <-- interfaz de contrato 00-remote
    └── src
        ├── 00-local
        │   ├── __tests__
        │   │   └── index.unit.spec.ts      <-- Pruebas unitarias para el contrato "00-local"
        │   ├── asconfig.json               <-- Ayudante de configuración para el compilador
        │   └── assembly
        │       └── index.ts                <-- contrato 00-local
        └── 00-remote
            ├── __tests__
            │   └── index.unit.spec.ts
            ├── asconfig.json
            └── assembly
                └── index.ts
```

### Preguntas clave

Existen algunas preguntas clave que generalmente surgen debido al contenido de este módulo, incluyendo: 

- Cuales son las ventajas y desventajas de usar uno u otro nivel de abstracción?
  - Hay una diferencia en el costo de almacenamiento, dependiente si se usa el API de alto nivel versus el API de bajo nivel. 
  - Hay una diferencia asociada al costo de gas usado (`burnt_gas`) para cada una de estas llamadas. 

- Cómo son las "Promises" reconciliadas en la blockchain? 
  - Las "Promises" en la plataforma NEAR son el nombre amigable, para los desarrolladores, de los recibos `ActionReceipt` y `DataReceipt`.
  - Las "Promises" se reconcilian en los límites de las funciones, y hasta el momento no hay soporte para un mecanismo como `await` en el ámbito (scope) de una función en un contrato. 
  - El valor de retorno de un "Promise" estará disponible en un bloque futuro, y hay únicamente dos maneras de capturar este valor: 
    1. Como el valor de retorno de la función exportada que eventualmente inició la llamada a la Promise, aunque indique que retorna `void`.
    2. Como los "resultados de la Promise", capturados por una función callback. 

## Conceptos clave de llamadas entre contratos

La posibilidad de llamar a un método de un contrato, desde otro contrato, es una funcionalidad invaluable en NEAR, debido a la manera en que están relacionadas las cuentas, contratos, y fragmentos (shards) en el protocolo NEAR. 

Cada cuenta en NEAR puede tener a lo sumo un contrato. Las cuentas de usuario generalmente no contienen un contrato mientras que las cuentas de DApps _si_ lo contienen. Algunas DApps hasta pueden requerir un sistema de contratos correlacionados que coordinan el trabajo de la DApp, en cuyo caso estos contratos estarán, probablemente, contenidos en subcuentas, un esquema válido de nombres para cuentas parecido a DNS. Por ejemplo, `dapp.near` puede ser el nivel de cuenta más alto, teniendo subcuentas como `module1.dapp.near`, `module2.dapp.near`, etc. para cada una de las partes correlacionadas de la DApp. 

Las cuentas "viven" en un único fragmento (shard) al cual califican de "hogar". Con esto queremos decir: todo su estado es almacenado en un único fragmento, y todas las llamadas a un contrato en esa cuenta, son enrutadas en la red a los nodos que validan a ese fragmento. Adicionalmente, el protocolo se reserva el derecho de redistribuir cuentas entre los fragmentos, lo cual beneficia a la red ya que aisla cuentas con alta demanda (es decir, contratos) a un fragment propio donde no afectarán el ancho de banda de todos los otros fragmentos del sistema. Al día de escribir este contenido, NEAR MainNet (la red principal) tiene un solo fragmento, pero el equipo de desarrollo NEAR Core y los Guilds en la comunidad trabajan arduamente y progresan a una red multi-fragmento (multi-shard).

Los desarrolladores que entiendan y vean las ventajas de usar este modelo para cuentas, reconoceran varios beneficios: 

- Cualquier contrato existente en la red (es decir, contratos core) pueden ser reutilizados en nuevas DApps mediante llamadas entre contratos. 
- DApps con puntos "hot spots" en el código del contrato (puntos con costo computacional elevado), pueden reorganizarse y separarse en múltples contratos, utilizando así las ventajas de llamadas entre contratos, y mejorar el rendimiento. 
- DApps con lógica compleja pueden ser reorganizados en contratos más simples y pequeños, simplificando el mantenimiento e incrementando las oportunidades de reutilización de contratos.
- DApps con transacciones de larga duración, que son imposibles o impracticas de acomodar en un solo bloque, pueden reorganizarse en múltiples llamadas entre contratos. 
- DApps cuyo diseño se beneficia de realizar múltiples llamadas en paralelo, pueden usar llamadas entre contratos para consolidar los resultados.

Sea por tener una ventaja al usar contratos existentes en la red, o creando por su cuenta un sistema de contratos interdependientes, el poder realizar llamadas entre contratos es una funcionalidad invaluable del protocolo NEAR y un diferenciador único de esta red de capa 1. 

## Llamadas a Funciones

El patrón mas común para realizar llamadas entre contratos, es llamando una función en un contrato desde otro contrato. Esta capacidad se logra mediante una interfaz dedicada para realizar este tipo de llamadas. 

Esta interfaz está implementada en dos niveles de abstracción: 
- Una interfaz ergonómica de alto nivel que provee soporte para tipos de AssemblyScript y Rust.
- Una interfaz estilo C de bajo nivel, que mapea al API de la máquina vritual de NEAR.

### Interfaz de Alto Nivel

La interfaz de alto nivel está diseñada para parecerse a la interfaz de Promise de JavaScript, y sirve de intermediaria a la interfaz de bajo nivel, utilizando tipos de AssemblyScript y Rust como parámetros. 

- `ContractPromise.create`: (método estático) utilizado para el patrón de uso más común, llamar un método de un contrato desde otro.
- `ContractPromise.all`: (método estático) permite consolidar los resultados de múltiples llamadas a métodos. 
- `ContractPromise.then`: permite encadenar múltiples llamadas a métodos (es decir, ejecutar uno luego que el anterior en la cadena termine su ejecución).

**cuándo usar esta interfaz?**

Esta interfaz está recomendada para todas las llamadas entre contratos que invocan a un contrato desde un método en otro contrato. Este escenario es el 80% de los casos. 

El valor de retorno de la llamada al método no será implicitamente capturado ni estará disponible. 

Para capturar el valor de retorno de la llamada, el desarrollador debe explicitamente escoger una de las siguientes opciones:
- obtenerlo luego de finalizar la llamada a la función ejecutada. 
- utilizar un callback a otra función. 

**cómo usar esta interfaz?**

Esta interfaz puede ser usada en cuatro patrones que pueden ser recombinados para crear escenarios mas complejos: 
1. Ignorar por completo el valor de retorno.
2. Reemplazar el valor de retorno de la función ejecutada con el nuevo valor de retorno del método remoto. 
3. Obtener el valor de retorno del método remoto utilizando un callback. 
4. Consolidar el valor de retorno de múltiples llamadas a métodos remotos. 

1. "Dispara y Olvida" (_el valor de retorno del método remoto será ignorado_)

```ts
export function fire_and_forget(): void {
  const promise = ContractPromise.create(
    remote_account,                            // nombre de cuenta remoto
    remote_method,                             // nombre de método remoto
    remote_args,                               // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a la llamada
  )
}
```

2. "Captura la bandera" (_el valor de retorno del médoto remoto se **convierte** en el valor de retorno del método actual_)

```ts
export function capture_the_flag(): void {
    remote_account,                            // nombre de cuenta remoto
    remote_method,                             // nombre de método remoto
    remote_args,                               // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a la llamada
  )
}
  // reemplazar el valor de retorno de este método con el resultado de la Promise
  promise.returnAsResult()
}
```

3. "Tal vez llamame" (_el valor de retorno del método remoto será enviado, por un callback, a otro método_)

```ts
export function call_me_maybe(): void {
  const callback_account = context.contractName
  const callback_method = 'on_complete'
  const callback_args = 'done and done'

  ContractPromise.create(
    remote_account,                            // nombre de cuenta remoto 
    remote_method,                             // nombre de método remoto
    remote_args,                               // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a la llamada
  )

  // asociar callback
  .then(
    callback_account,                          // nombre de cuenta para callback
    callback_method,                           // nombre de método callback
    callback_args,                             // argumentos de método callback
    BASIC_GAS,                                 // gas asociado al callbach (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado al callback
  )
}

// el método callback en si
export function on_complete(args: string): void {
  logging.log(args)
}
```

4. "Todos juntos" (_el valor de retorno de cada método remoto será consolidado en una tupla_)

```ts
export function all_together_now(): void {
  const promise_1 = ContractPromise.create(
    remote_account_1,                          // nombre de cuenta remoto
    remote_method_1,                           // nombre de método remoto
    remote_args_1,                             // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamda (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a llamada
  )

  const promise_2 = ContractPromise.create(
    remote_account_2,                          // nombre de cuenta remoto
    remote_method_2,                           // nombre de método remoto
    remote_args_2,                             // argumentos de método remoto
    BASIC_GAS,                                 // ggas asociado a la llamda (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a llamada
  )

  // consolidar las múltiples llamadas 
  const promise_3 = ContractPromise.all(promise_1, promise_2)

  // reemplazar el valor de retorno de este metodo con el valor de retorno de la consolidación de Promises
  promise_3.returnAsResult()
}
```

### Interfaz de Bajo Nivel

Esta interfaz de bajo nivel al estilo C se comunica directamente con la máquina virtual de NEAR y tiene soporte de las siguientes operaciones: 

- `promise_create`: usado en el patrón mas común, llamando un método de un contrato desde otro.
- `promise_and`: permite consolidar los resultados de múltiples llamadas a métodos.
- `promise_then`: permite encadenar múltiples llamadas a métodos (es decir, ejecutar una llamada luego que la anterior en la cadena termine de ejecutar).

**cuándo usar esta interfaz?**

El uso de esta interfaz no esta recomendada para los desarrolladores. En su lugar, por favor use la interfaz de alto nivel explicada anteriormente. 

**cómo usar esta interfaz?**

Esta interfaz requiere que todas las entradas sean convertidas a `UInt8Arrays`, y su longitud y puntero `datastart` sea provisto a la función. El valor de retorno de esta interfaz es un valor entero, que identifica de manera única el recibo `ActionReceipt` generado por el método utilizado por el Runtime de NEAR Protocol para coordinar el flujo de llamadas entre contratos y las cuentas afectadas en el tiempo (es decir, bloques).

```ts
export function promise_create(
    account_id_len: u64,
    account_id_ptr: u64,
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    amount_ptr: u64,
    gas: u64
  ): u64;
```

```ts
export function promise_then(
    promise_index: u64,
    account_id_len: u64,
    account_id_ptr: u64,
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    amount_ptr: u64,
    gas: u64
  ): u64;
```

```ts
  export declare function promise_and(
    promise_idx_ptr: u64,
    promise_idx_count: u64
  ): u64;
```

## Llamadas por Lote

Otra forma de realizar llamadas entre contratos es creando una transacción utilizando una o mas acciones primitivas, para luego enviarla a la red desde un contrato. Esta funcionalidad la provee una interfaz dedicada para invocar estas llamadas. 

Esta interfaz está implementada en dos niveles de abstracción: 
- Una interfaz ergonómica de alto nivel que provee soporte para tipos de AssemblyScript y Rust.
- Una interfaz estilo C de bajo nivel, que mapea al API de la máquina vritual de NEAR.

### Ocho (8) Acciones

El protocolo NEAR provee ocho (8) acciones primitivas que pueden utilizarse para producir una sola transacción. Este diseño provee un mecanismo flexible para controlar el comportamiento de la red por parte de los desarrolladores.

Utilizando llamadas por lote entre contratos, los desarrolladores añaden cualquiera de las siguientes ocho acciones NEAR a un lote de transacciones, el cual es entonces procesado por la red: 

- Administrar Cuentas
  - `CreateAccount`: crear una nueva cuenta (para una persona, contrato, nevera, etc.).
  - `DeleteAccount`: eliminar una cuenta (y transferir el balance a una cuenta beneficiaria).
- Administrar Llaves de Acceso (Access Keys)
  - `AddKey`: añadr una llave a una cuenta (con acceso FullAccess o con acceso FunctionCall).
  - `DeleteKey`: eliminar una llave existente de una cuenta.
- Administrar Dinero
  - `Transfer`: mover tokens de una cuenta a otra.
  - `Stake`: expresar interés en asumir el rol de validador en la próxima oportunidad disponible.
- Administrar Contratos: 
  - `DeployContract`: desplegar el contrato. 
  - `FunctionCall`: invocar un método de un contrato (incluyendo presupuesto de cómputo y almacenamiento).

### Interfaz de Alto Nivel

La interfaz de alto nivel usa una cadena de ejecución donde las transacciones son construidas encadenando llamadas que agregan acciones diferentes. 
  
- `ContractPromiseBatch.create`: (método estático) crea un Promise con una cuenta específica como destino, que es la cuenta en la cual la transacción sera efectuada. 
- `ContractPromiseBatch.create_account`: crea la cuenta destino.
- `ContractPromiseBatch.delete_account`: elimina la cuenta destino. 
- `ContractPromiseBatch.add_access_key`: añadir una llave de acceso para llamada (Function Call access key) a la cuenta destino. 
- `ContractPromiseBatch.add_full_access_key`: añadir una llave de acceso completo (Full Access key) a la cuenta destino. 
- `ContractPromiseBatch.delete_key`: eliminar una llave de la cuenta destino.
- `ContractPromiseBatch.transfer`: transferir tokens NEAR desde la cuenta actual a la cuenta destino. 
- `ContractPromiseBatch.stake`: realiza una operación stake en la cuenta destino.
- `ContractPromiseBatch.deploy_contract`: despliega un contrato (arreglo de bytes) a la cuenta destino. 
- `ContractPromiseBatch.function_call`: invocar un método en el contrato contenido en la cuenta destino. 
- `ContractPromiseBatch.then`: encadena una transacción a otra transacción, cuyo destino es una cuenta nueva (aunque puede ser la misma).

**cuándo usar esta interfaz?**

Esta interfaz es recomendada para todas las llamadas entre contratos que deban crear transacciones compuestas de acciones mas allá de `FunctionCall` (aunque esta acción específica _también_ es soportada por esta interfaz). Este mecanismo anorda el 20% de los casos de uso que uno pueda imaginarse, a la fecha de escritura de esta guía.

El valor de retorno de la llamada al método no será implicitamente capturado ni estará disponible. 

Para capturar el valor de retorno de la llamada, el desarrollador debe explicitamente escoger una de las siguientes opciones:
- obtenerlo luego de finalizar la llamada a la función ejecutada. 
- utilizar un callback a otra función. 

Estas opciones para obtener un valor de retorno no son mutuamente exclusivas. Los desarrolladores pueden no usar ninguna, una, o ambas, al realizar llamadas entre contratos, dependiendo de los requerimientos. 

**cómo usar esta interfaz?**
    
Las llamadas por lote pueden ser consideradas como un superconjunto de la interfaz de llamadas a funciones explicada anteriormente. Es posible, entonces, recrear todos los patrones expuestos anteriormente utilizando esta nueva interfaz, con una única excepción. 

*La interfaz por lote maneja de manera diferente los retornos de valores, y como consecuencia, no tiene la habilidad de resolver la llamada entre contratos con `returnAsResult()` que reemplazaria el valor de retorno del método actual (local) con el del método remoto.*

> **La única manera de obtener los resultados de una llamada entre contratos, iniciada por la interfaz de llamada por lote, es utilizando un método callback.**

Repitiendo la misma lista escrita anteriormente: 
1. Ignorar por completo el valor de retorno.
2. **(no soportada por llamada por lote)**Reemplazar el valor de retorno de la función ejecutada con el nuevo valor de retorno del método remoto. 
3. Obtener el valor de retorno del método remoto utilizando un callback. 
4. Consolidar el valor de retorno de múltiples llamadas a métodos remotos. 

1. "Dispara y Olvida" (_el valor de retorno del método remoto será ignorado_)

```ts
export function fire_and_forget(): void {
  const promise = ContractPromiseBatch.create(remote_account) // nombre de cuenta contrato remoto
    .function_call(
      remote_method,                           // nombre de método remoto
      remote_args,                             // arugmentos de método remoto
      u128.Zero                                // deposito asociado a la llamada
      BASIC_GAS,                               // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    )
}
```

2. "Captura la bandera" (_el valor de retorno del médoto remoto se **convierte** en el valor de retorno del método actual_)

**NO SOPORTADA** por esta interfaz.

*La interfaz de llmada por lote requiere de un método callback para obtener los resultados de una transacción entre contratos*

3. "Tal vez llamame" (_el valor de retorno del método remoto será enviado, por un callback, a otro método_)

```ts
export function call_me_maybe(): void {
  const callback_account = context.contractName
  const callback_method = 'on_complete'
  const callback_args = 'done and done'


  ContractPromiseBatch.create(remote_account)  // nombre de cuenta contrato destino
    .function_call(
      remote_method,                           // nombre de método remoto
      remote_args,                             // argumentos del método remoto
      u128.Zero,                               // deposito asociado a la llamada 
      BASIC_GAS,                               // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    )

    // registrar callback
    .then(callback_account)                    // nombre de cuenta contrato callback
    .function_call(
      callback_method,                         // nombre de callback
      callback_args,                           // argumentos de callback
      u128.Zero,                               // deposito asociado al callback
      BASIC_GAS,                               // gas asociado al callback (~5 Tgas (5e12) por "salto")
    )
}

// el método callback
export function on_complete(args: string): void {
  logging.log(args)
}
```

4. "Todos juntos" (_el valor de retorno de cada método remoto será consolidado en una tupla_)

```ts
export function all_together_now(): void {
  const promise_1 = ContractPromiseBatch.create(remote_account_1)  // nombre de cuenta contrato remoto
    .function_call(
      remote_method_1,                         // nombre de método remoto
      remote_args_1,                           // argumentos de método remoto
      u128.Zero,                               // deposito asocido a la llamada
      BASIC_GAS,                               // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    )

  const promise_2 = ContractPromiseBatch.create(remote_account_2)   // nombre de cuenta contrato remoto
    .function_call(
      remote_method_2,                         // nombre de método remoto
      remote_args_2,                           // arugmentos de método remoto
      u128.Zero,                               // deposit asoaciado a la llamada
      BASIC_GAS,                               // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
   )

  // consolidar múltiples llamadas
  const promise_3 = ContractPromise.all(promise_1, promise_2)

  const callback_account = context.contractName
  const callback_method = 'on_all_complete'
  const callback_args = 'all for one, done and done'

  // para obtener los resultados de estas dos llamadas, registra una tercera como callback
  promise_3.then(callback_account)             // nombre de cuenta contrato callback
    .function_call(
      callback_method,                         // nombre de método callback
      callback_args,                           // argumentos de método callback
      u128.Zero,                               // deposito asociado al método callback
      BASIC_GAS,                               // gas asociado al método callback (~5 Tgas (5e12) por "salto")
    )
}

// el método callback en sí
export function on_all_complete(args: string): void {
  logging.log(args)
}
```

Adicionalmente, la interfaz por lote permite realizar llamadas entre contratos que no son posibles utilizando la interfaz de llamada por función. Usando llamadas por lote, los desarrolladores pueden crear y transmitir cualquier transacción imaginable desde _su contrato_. 

Esto ofrece patrones muy poderosos a la hora de trabajar con contratos que incluyen (pero no limitan) los siguientes: 

- Patrón Proxy: los contratos pueden redireccionar transferencias de una cuenta a otra. 
- Patrón Fábrica: los contratos pueden generar cuentas nuevas, para luegar añadirles llaves y desplegar un contrato a esas cuentas. 
- Patrón Freemium: los contratos pueden agregar llaves de acceso a funciones con una tarifa precalculada, para usuarios que estén en período de prueba y/o evaluación. 

1. "Foxy Proxy" (_un contrato puede recibir llamadas y redireccionarlas a otros contratos_).

```ts
export function foxy_proxy(): void {
  const attached_deposit = context.attachedDeposit

  const part_a = u128.div(attached_deposit, 2)
  const part_b = u128.div(attached_deposit, 2)

  ContractPromiseBatch.create(recipient_a).transfer(part_a)
  ContractPromiseBatch.create(recipient_b).transfer(part_b)
}
```

2. "La Fábrica X" (_un contrato puede crear cuentas nuevas, desplegar contratos a éstas e inicializar su estado_)

```ts
export function the_x_factory(contract: string, account: string, key: string): void {
  // obtener fondos para una cuenta nueva de un depósito adjunto
  const funding = context.attachedDeposit

  //  contratos desplegables pueden ser almacenados como strings codificadas en Base64 en algun registro desplegado como parte del contrato fábrica
  const dynamicContract = base64.decode(contractRegistry.getSome(contract))

  ContractPromiseBatch.create(account)
    .create_account()                          // crear nuevo contrato
    .transfer(funding)                         // depositar 
    .add_full_access_key(util.decode(key))     // añadir llave de acceso completo para que el iniciador de la llmada pueda controlar la cuenta
    .deploy_contract(dynamicContract)          // desplegar un contrato pre-existente a la cuenta
}
```

3. "Freemium convertido en Premium" (_un contato puede administrar las llaves de acceso a llamada por función bajo un esquema de tiempo y presupuesto limitado fremium_)

```ts
export function freemium_becometh_premium(user: string, key: string): void {
  const dapp_account = context.contractName
  const fremium_dapp_user_account = user + '.' + dapp_account

  const ONE_NEAR = u128.from(10 ^ 24)
  const TRIAL_BUDGET = u128.mul(u128.from(10), ONE_NEAR) // 10 NEAR
  const ACCOUNT_BALANCE = u128.mul(u128.from(11), ONE_NEAR) // 11 NEAR (dejar 1 NEAR para prevenir la eliminación de la cuenta de prueba)

  ContractBatchPromise.create(fremium_dapp_user_account)
    .create_account()
    .transfer(ACCOUNT_BALANCE)
    .add_access_key(
      key,                                     // llave pública relacionada a la llave privada en poder del usuario
      TRIAL_BUDGET,                            // el presupuesto total asignado a la llave de acceso para esta función
      dapp_account,                            // destinatario, la cuenta DApp que contiene el contrato DApp
      ['trial_method_1', 'trial_method_2'],    // los métodos en esta Dapp que el usuario en período de prueba puede ejecutar usando esta llave de acceso
      0                                        // asignar 0 a la llave de acceso de la llamada a funcion (FunctionCall access key)
  )
}
```

Dada la flexibiidad de esta interfaz, los desarrolladores pueden crear cualquier transacción imaginable desde el código de su contrato. 

### Interfaz de Bajo Nivel

- `promise_batch_create`: crea una Promise que especifica una cuenta destinataria específica, en la cual la transacción será aplicada.
- `promise_batch_action_create_account` : crear la cuenta destino.
- `promise_batch_action_delete_account`: eliminar la cuenta destino. 
- `promise_batch_action_add_key_with_function_call`: añadir una llave de llamada de función a la cuenta destino.
- `promise_batch_action_add_key_with_full_access`: añadir una llave de acceso completo a la cuenta destino.
- `promise_batch_action_delete_key`: eliminar una llava de acceso en la cuenta destino. 
- `promise_batch_action_transfer`: transferir tokens NEAR desde la cuenta actual a la cuenta destino.
- `promise_batch_action_stake`: realizar un stake de tokens por parte de la cuenta destino.
- `promise_batch_action_deploy_contract` : desplegar un contrato (como un arreglo de bytes) a la cuenta destino.
- `promise_batch_action_function_call`: invocar un método del contrato contenido en la cuenta destino. 
- `promise_batch_then`: encadena una transacción a otra transacción, cuyo destino es una cuenta nueva (aunque puede ser la misma).

**cúando usar esta interfaz?**

Esta interfaz no es recomendada para los desarrolladores. En su lugar, por favor use la interfaz de alto nivel. 

**cómo usar esta interfaz?**

Esta interfaz requiere que todas las entradas sean convertidas a `UInt8Arrays`, y su longitud y puntero `datastart` sea provisto a la función. El valor de retorno de esta interfaz es un valor entero, que identifica de manera única el recibo `ActionReceipt` generado por el método utilizado por el Runtime de NEAR Protocol para coordinar el flujo de llamadas entre contratos y las cuentas afectadas en el tiempo (es decir, bloques).

```ts
export function promise_batch_create(
  account_id_len: u64,
  account_id_ptr: u64
): u64;
```

```ts
export function promise_batch_then(
  promise_index: u64,
  account_id_len: u64,
  account_id_ptr: u64
): u64;
```

```ts
// Otros métodos de la interfaz de bajo nivel (aquellos para cada acción) han sido omitidos por brevedad.
// Pueden ser encontrados en el siguiente link: https://github.com/near/near-sdk-as/blob/master/sdk-core/assembly/env/env.ts#L159-L233
```

## Obteniendo Resultados

Los desarrolladores escogen si (a) obtener o no los resultados y (b) cómo obtener éstos dependiendo de los requerimientos. 

**cúando?**

Los resultados de llamadas entre contratos son obtenidos de una de dos maneras: 
- Los resultados de una llamada a un método remoto pasarán a ser el valor de retorno del médoto actual (local).
- Los resultados del método llamado (remoto) pueden ser extraídos del ambiente utilizando la interfaz dedicada `ContractPromiseResult`.

|                      | ContractPromise.getResults  | ContractPromiseResult |       |
| :------------------- | :-------------------------: | :-------------------: | :---: |
| Llamadas por Función |          soportado          |       soportado       |       |
| Llamadas por Lote    |          soportado          |     No soportado      |       |

Los desarrolladores también pueden inspeccionar el número de resultados disponibles en una tupla de resultados, si los valores de retorno de las llamadas entre contratos fueron consolidados. 

### Interfaz de Alto Nivel

- `ContractPromise.getResults`
- `ContractPromiseResult`

### Interfaz de Bajo Nivel

**cómo usar esta interfaz?**

```js
export function promise_results_count(): u64;
```

```ts
export function promise_result(
  result_idx: u64,
  register_id: u64
): u64;
```

```ts
export function promise_return(
  promise_id: u64
): void;
```

